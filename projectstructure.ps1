Get-ChildItem -Recurse -Force |
Where-Object {
  $_.FullName -notmatch "\\node_modules\\|\\.git\\|dist\\|build\\|\\.vercel\\|\\.claude\\|\\docs\\"
} |
ForEach-Object {
  $_.FullName.Replace((Get-Location).Path + "\", "")
} |
Out-File projectstructure.md
