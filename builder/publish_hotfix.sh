#!/bin/sh
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

if [[ -z "$1" ]]
then
    echo "${RED}要输入一个分支名(不需要hotfix前缀)${NC}"
    exit 1
else
    echo "${GREEN}check git status:"
    STATUS="$(git status)"
    echo "${NC}${STATUS}"
    if [[ $UNSTAGED_DIFF =~ working\ tree\ clean$ ]]
    then 
	echo "${NC}branch is clean"
    else
	echo "${RED}有未提交的改动，操作取消"
	exit 0
    fi
    DIFF="$(git diff --cached --name-only)"
    if [[ $DIFF =~ version\.html]]
    then
    else
	echo "版本号没有变化，是否确认？"
    fi
    exit 2
    echo "${GREEN}1. pull master:${NC}"
    git pull origin master
    echo "${GREEN}2. meger master${NC}"
    git merge master
    echo "${GREEN}3. commit hotfix branch:${NC}"
    git commit
    echo "${GREEN}4. switch to master:${NC}"
    git checkout master
    echo "${GREEN}5. merge hotfix to master:${NC}"
    git merge hotfix_$1
    echo "${GREEN}6. tag:${NC}"
    node tag.js --m
    echo "${GREEN}6. push master:${NC}"
    git push -u origin master --tag
    echo "${GREEN}done${NC}"
    exit 0
fi
