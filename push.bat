@echo off
git add * > nul
echo Commit message: 
set /p message= > nul
git commit -m "%message%"
git push
pause