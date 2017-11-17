#!/bin/sh

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

if [[ -z "$1" ]]
then
    echo "${RED}要输入一个分支名(不需要hotfix前缀)${NC}"
    exit 1
else
    echo "${GREEN}1. check git status ...${NC}"
    STATUS="$(git status)"
    echo "${NC}${STATUS}"
    if [[ $STATUS =~ working\ tree\ clean$ ]]
    then 
	echo "${NC}branch is clean"
    else
	echo "${RED}有未提交的改动，操作取消${NC}"
	exit 0
    fi
   
    LATEST_TAG="$(git tag --sort version:refname | tail -n 1)"
 
    echo "${GREEN}2. check version ...${NC}"
    DIFF="$(git diff ${LATEST_TAG} HEAD --name-only)"
    if [[ $DIFF =~ version\.html$ ]]
    then
        echo "版本号已变化"
    else
	while true; do
	    read -p "版本号没改，是否确认上线？[y|n]" yn
	    case $yn in
	        [Yy]* ) break;;
	        [Nn]* ) echo "${RED}操作取消${NC}";exit 2;;
	        * ) echo "Please answer yes or no.";;
	    esac
	done
    fi

    echo "${GREEN}3. pull master ...${NC}"
    git pull origin master
    echo "${GREEN}4. meger master ...${NC}"
    git merge master
    echo "${GREEN}5. commit hotfix branch ...${NC}"
    git commit
    echo "${GREEN}6. switch to master ...${NC}"
    git checkout master
    echo "${GREEN}7. merge hotfix to master ...${NC}"
    git merge hotfix_$1
    echo "${GREEN}8. tag:${NC}"
    node tag.js --m
    echo "${GREEN}9. push master ...${NC}"
    git push -u origin master --tag
    echo "${GREEN}done${NC}"
    exit 0
fi
