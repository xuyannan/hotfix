#!/bin/sh
if [[ -z "$1" ]]
then
    echo "要输入一个分支名(不需要hotfix前缀)"
else
    echo '1. pull master:'
    git pull origin master
    echo '2. meger master:'
    git merge master
    echo '3. commit hotfix branch:'
    git commit
    echo '4. switch to master:'
    git checkout master
    echo '5. merge hotfix to master:'
    git merge hotfix_$1
    echo '6. push master:'
    git push -u origin master
fi
