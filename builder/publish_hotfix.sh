#!/bin/sh
if [[ -z "$1" ]]
then
    echo "要输入一个分支名(不需要hotfix前缀)"
else
    git pull origin master
    git merge master
    git commit
    git checkout master
    git merge hotfix_$1
fi
