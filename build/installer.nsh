!macro customHeader
  SilentInstall silent
  SilentUnInstall silent
!macroend

!macro customInit
  SetSilent silent
!macroend

!macro customInstall
  CreateDirectory "$APPDATA\ZyphorLauncher\screenshots\stay"
  ${ifNot} ${isUpdated}
    ExecWait '"$INSTDIR\Zyphor Launcher.exe" --mode=install' $0
    ${if} $0 != 0
      RMDir /r "$INSTDIR"
      Quit
    ${endif}
  ${endif}
!macroend

!macro customUnInit
  ${ifNot} ${isUpdated}
    ExecWait '"$INSTDIR\Zyphor Launcher.exe" --mode=uninstall' $0
    ${if} $0 != 0
      Quit
    ${endif}
    SetSilent silent
  ${endif}
!macroend