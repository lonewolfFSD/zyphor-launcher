const { BrowserWindow, screen } = require('electron');
const { exec } = require('child_process');
const path = require('path');

let blackoutWindows = [];
let cursorLockInterval = null;
let isImmersionActive = false;

async function checkHDRSupport() {
  return new Promise((resolve) => {
    try {
      const primary = screen.getPrimaryDisplay();
      const colorDepth = primary ? primary.colorDepth : 24;

      const psScript = `
        $ErrorActionPreference = 'SilentlyContinue'
        $isSupported = $false
        $isEnabled = $false

        try {
          $reg = Get-ItemProperty -Path "HKCU:\\Control Panel\\Desktop" -Name "EnableHDR" -ErrorAction SilentlyContinue
          if ($reg -and $reg.EnableHDR -eq 1) {
            $isSupported = $true
            $isEnabled = $true
          }

          $gfx = Get-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\VideoSettings" -Name "EnableHDR" -ErrorAction SilentlyContinue
          if ($gfx) {
            $isSupported = $true
            if ($gfx.EnableHDR -eq 1) { $isEnabled = $true }
          }
        } catch {}

        if (-not $isSupported -and ${colorDepth} -ge 30) {
          $isSupported = $true
        }

        [PSCustomObject]@{
          supported = $isSupported
          enabled = $isEnabled
          colorDepth = ${colorDepth}
        } | ConvertTo-Json -Compress
      `;

      exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, ' ')}"`, (err, stdout) => {
        if (err || !stdout) {
          const supported = colorDepth >= 30;
          return resolve({ supported, enabled: false, colorDepth });
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          resolve({
            supported: Boolean(parsed.supported),
            enabled: Boolean(parsed.enabled),
            colorDepth: parsed.colorDepth || colorDepth,
          });
        } catch {
          resolve({ supported: colorDepth >= 30, enabled: false, colorDepth });
        }
      });
    } catch (e) {
      resolve({ supported: false, enabled: false, colorDepth: 24 });
    }
  });
}

function enableBlackout() {
  disableBlackout();
  try {
    const allDisplays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    if (allDisplays.length <= 1) return;

    allDisplays.forEach((disp) => {
      if (disp.id !== primaryDisplay.id) {
        const win = new BrowserWindow({
          x: disp.bounds.x,
          y: disp.bounds.y,
          width: disp.bounds.width,
          height: disp.bounds.height,
          frame: false,
          transparent: false,
          backgroundColor: '#000000',
          alwaysOnTop: true,
          skipTaskbar: true,
          focusable: false,
          resizable: false,
          movable: false,
          hasShadow: false,
          show: false,
        });

        win.loadURL('data:text/html;charset=utf-8,<html><body style="background:%23000000;margin:0;overflow:hidden;cursor:none;"></body></html>');
        win.once('ready-to-show', () => {
          win.show();
          win.setAlwaysOnTop(true, 'screen-saver');
        });

        blackoutWindows.push(win);
      }
    });
  } catch (err) {
    console.error('[Immersion] Failed to create blackout window:', err);
  }
}

function disableBlackout() {
  blackoutWindows.forEach((win) => {
    try {
      if (!win.isDestroyed()) win.close();
    } catch {}
  });
  blackoutWindows = [];
}

function enableCursorLock(gameExeName = 'STAY') {
  disableCursorLock();

  const script = `
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT { public int Left, Top, Right, Bottom; }
    public class Win32Immersion {
      [DllImport("user32.dll")] public static extern bool ClipCursor(ref RECT lpRect);
      [DllImport("user32.dll")] public static extern bool ClipCursor(IntPtr lpRect);
      [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
      [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    }
"@ -ErrorAction SilentlyContinue
    $hwnd = [Win32Immersion]::GetForegroundWindow()
    $rect = New-Object RECT
    if ([Win32Immersion]::GetWindowRect($hwnd, [ref]$rect)) {
      [Win32Immersion]::ClipCursor([ref]$rect)
    }
  `;

  cursorLockInterval = setInterval(() => {
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/\n/g, ' ')}"`, () => {});
  }, 2000);
}

function disableCursorLock() {
  if (cursorLockInterval) {
    clearInterval(cursorLockInterval);
    cursorLockInterval = null;
  }
  const unclip = `Add-Type -TypeDefinition '[DllImport("user32.dll")] public static extern bool ClipCursor(IntPtr lpRect);' -Name Win32Clip -Namespace Win32 -ErrorAction SilentlyContinue; [Win32.Win32Clip]::ClipCursor([IntPtr]::Zero)`;
  exec(`powershell -NoProfile -Command "${unclip}"`, () => {});
}

function enableKeySuppression() {
  exec(`reg add "HKCU\\Control Panel\\Accessibility\\StickyKeys" /v "Flags" /t REG_SZ /d "506" /f`, () => {});
  exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v "NOC_GLOBAL_SETTING_TOASTS_ENABLED" /t REG_DWORD /d 0 /f`, () => {});
}

function disableKeySuppression() {
  exec(`reg add "HKCU\\Control Panel\\Accessibility\\StickyKeys" /v "Flags" /t REG_SZ /d "510" /f`, () => {});
  exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" /v "NOC_GLOBAL_SETTING_TOASTS_ENABLED" /t REG_DWORD /d 1 /f`, () => {});
}

function optimizeGameProcess(gameExeName = 'STAY.exe') {
  const procName = path.basename(gameExeName, path.extname(gameExeName));
  exec(`powershell -NoProfile -Command "Get-Process -Name '${procName}' -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = 'High' }"`, (err) => {
    if (!err) console.log(`[Immersion] Set process priority HIGH for ${procName}`);
  });

  exec(`powershell -NoProfile -Command "[System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()"`, () => {});
}

function toggleWindowsHDR() {
  const script = `
    $wshell = New-Object -ComObject wscript.shell;
    $wshell.SendKeys('^%{b}')
  `;
  exec(`powershell -NoProfile -Command "${script.replace(/\n/g, ' ')}"`, () => {});
}

let previousAudioDevice = null;

function enableAudioRouting() {
  const script = `
    $ErrorActionPreference = 'SilentlyContinue'
    try {
      # Detect connected sound devices
      $devs = Get-CimInstance Win32_SoundDevice | Where-Object { $_.Status -eq 'OK' }
      $headset = $devs | Where-Object { $_.Name -match 'Headset|Headphones|Earphones|Wireless|Gaming' } | Select-Object -First 1
      if ($headset) {
        Write-Output "HEADSET_FOUND:$($headset.Name)"
      }
    } catch {}
  `;
  exec(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${script.replace(/\n/g, ' ')}"`, (err, stdout) => {
    if (!err && stdout && stdout.includes('HEADSET_FOUND:')) {
      console.log('[Immersion] Headset device detected for audio routing:', stdout.trim());
    }
  });
}

function disableAudioRouting() {
  previousAudioDevice = null;
}

function onGameLaunch(settings = {}) {
  isImmersionActive = true;

  if (settings.immersionBlackoutSecondary) {
    enableBlackout();
  }

  if (settings.immersionLockCursor) {
    enableCursorLock('STAY');
  }

  if (settings.immersionBlockWinKeys) {
    enableKeySuppression();
  }

  if (settings.immersionAutoAudio) {
    enableAudioRouting();
  }

  if (settings.immersionHighPriority) {
    setTimeout(() => optimizeGameProcess('STAY.exe'), 1200);
  }

  if (settings.immersionAutoHDR) {
    toggleWindowsHDR();
  }
}

function onGameExit(settings = {}) {
  if (!isImmersionActive) return;
  isImmersionActive = false;

  disableBlackout();
  disableCursorLock();
  disableKeySuppression();
  disableAudioRouting();

  if (settings.immersionAutoHDR) {
    toggleWindowsHDR();
  }
}

module.exports = {
  checkHDRSupport,
  enableBlackout,
  disableBlackout,
  enableCursorLock,
  disableCursorLock,
  enableKeySuppression,
  disableKeySuppression,
  optimizeGameProcess,
  toggleWindowsHDR,
  enableAudioRouting,
  disableAudioRouting,
  onGameLaunch,
  onGameExit,
};
