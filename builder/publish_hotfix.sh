#!/bin/sh
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'
if [[ -z "$1" ]]
then
    echo "要输入一个分支名(不需要hotfix前缀)"
else
    echo '${GREEN}check git status:'
    UNSTAGED_DIFF="$(git status)"
    echo "${UNSTAGED_DIFF}"
    if [[ $UNSTAGED_DIFF =~ working\ tree\ clean$ ]]
    then 
	echo "${NC}branch is clean"
    else
	echo "${RED}有未提交的改动，操作取消"
	exit 0
    fi
    echo '1. pull master:'
    git pull origin master
    echo '2. meger master:'
    # git merge master
    # echo '3. commit hotfix branch:'
    # git commit
    # echo '4. switch to master:'
    # git checkout master
    # echo '5. merge hotfix to master:'
    # git merge hotfix_$1
    # echo '6. push master:'
    # git push -u origin master
fi
