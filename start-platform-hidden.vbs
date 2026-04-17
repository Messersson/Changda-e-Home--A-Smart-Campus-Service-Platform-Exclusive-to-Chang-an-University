Option Explicit

Dim shell
Dim fso
Dim scriptDir
Dim command
Dim i

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = scriptDir

command = "node .\scripts\start-platform.js"

For i = 0 To WScript.Arguments.Count - 1
  command = command & " " & QuoteArgument(WScript.Arguments.Item(i))
Next

shell.Run command, 0, False

Function QuoteArgument(value)
  QuoteArgument = """" & Replace(value, """", """""") & """"
End Function
