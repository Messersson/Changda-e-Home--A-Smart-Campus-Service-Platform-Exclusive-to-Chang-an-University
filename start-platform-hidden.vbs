Option Explicit

Dim shell
Dim fso
Dim scriptDir
Dim command
Dim i
Dim logRoot
Dim logDir
Dim outLog
Dim errLog

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = scriptDir

logRoot = fso.BuildPath(scriptDir, "logs")
logDir = fso.BuildPath(logRoot, "launcher")
outLog = fso.BuildPath(logDir, "start-platform.out.log")
errLog = fso.BuildPath(logDir, "start-platform.err.log")

If Not fso.FolderExists(logRoot) Then
  fso.CreateFolder(logRoot)
End If

If Not fso.FolderExists(logDir) Then
  fso.CreateFolder(logDir)
End If

command = "node " & QuoteArgument(fso.BuildPath(scriptDir, "scripts\start-platform.js"))

For i = 0 To WScript.Arguments.Count - 1
  command = command & " " & QuoteArgument(WScript.Arguments.Item(i))
Next

command = command & " >> " & QuoteArgument(outLog) & " 2>> " & QuoteArgument(errLog)

shell.Run "cmd.exe /d /c " & QuoteArgument(command), 0, False

Function QuoteArgument(value)
  QuoteArgument = """" & Replace(value, """", """""") & """"
End Function
