var Git = require("nodegit");
var compareVersions = require('compare-versions');
var _ = require("underscore");
var fs = require("fs");
var os = require('os');
var basePath = require('./config.js').basePath;
var inquirer = require('inquirer');

var args = [];
process.argv.forEach(function (val, index) {
    if (index >= 2) {
        args.push(val);
    }
});

if (_.contains(args, "--help")) {
    console.log("Usage: node tag.js [updateMajorVersion/updateMinorVersion]");
    console.log("");
    console.log("node tag.js --m   忽略自动生成的上线内容，重新填写上线内容");
    return;
}
var now = new Date();
var logReadCutoffTime = now.setMonth(now.getMonth() - 3);

var updateMajorVersion = _.contains(args, "updateMajorVersion");
var updateMinorVersion = _.contains(args, "updateMinorVersion");
var isIgnoreAutoGeneratedTagMessage = _.contains(args, "--m");

var GitTag = Git["Tag"];
var GitRevwalk = Git["Revwalk"];

var Reg = /(\d{8})\_(\d{1,2})\.(\d{1,2})\.(\d{1,3})/;
var RegLocalBranches = /(refs\/heads\/)/;
var RegReomteBraches = /(refs\/remotes\/origin\/)/
var validMessageReg = /^\*\s*(\w|\W)+/;
var repo;
var latestTag;
var tagCommitId;
var mostRecentCommitId;
var mostRecentCommit;
var tagMessage;
var newTagName;

// var cliSelect = CLI_select({
//     pointer: ' ▸ ',
//     pointerColor: 'yellow',
//     multiSelect: false
// });


function formatDate (date) {
    var month = date.getMonth() + 1,
        day = date.getDate();
    return [date.getFullYear(), (month < 10 ? "0" + month : month), (day < 10 ? "0" + day : day)].join("");
}
function getBranches(references) {
    var branches = [];
    var remotes = [];
    _.each(references, function (reference) {
        if (RegLocalBranches.test(reference)) {
            branches.push(reference.replace(RegLocalBranches, ""));
        }
        if (RegReomteBraches.test(reference)) {
            remotes.push(reference.replace(/(refs\/remotes\/)/, ""));
        }
    })
    return [branches, remotes];
}
function generateNewTag (tag, branch) {
    var match = Reg.exec(tag);
    var days = formatDate(new Date());
    var versions;
    var patchVersion;
    if (updateMajorVersion) {
        versions = [parseInt(match[2]) + 1, 0, 0].join(".");
    } else if (updateMinorVersion) {
        versions = [match[2], parseInt(match[3]) + 1, 0].join(".");
    } else {
        patchVersion = parseInt(match[4]) + 1;
        if (patchVersion % 10 === 4 || patchVersion % 10 === 7) {
            patchVersion++;
        }
        versions = [match[2], match[3], patchVersion].join(".");
    }
    return [days, versions, branch].join("_");
}

function autoGenerateTagMessage(messages) {
    var message;
    var validMessage = [];
    var latest;
    _.each(messages, function (item) {
        if (validMessageReg.test(item.message)) {
            validMessage.push(item.message);
        }
    });
    validMessage = _.uniq(validMessage);
    if (!validMessage.length) {
        latest = _.chain(messages).sortBy("time").filter(function (item) {
            return item.message.indexOf("Merge") === -1;
        }).last().value();
        if (latest) {
            message = latest.message;
        }
    } else {
        message = validMessage.join(os.EOL);
    }
    return message;
}

var getTagList = (repository) => {
    repo = repository;
    return GitTag.list(repo);
};
var listBranch = (tags) => {
    var matchedTags = [],
        latestVersion;
    _.each(tags, function (tag) {
        Reg.test(tag) && matchedTags.push(tag.split("_")[1]);
    });
    latestVersion = _.last(matchedTags.sort(compareVersions));
    latestTag = _.find(tags, function(tag) {
        return tag.indexOf(latestVersion) >= 0;
    });
    return repo.getReferenceNames(Git.Reference.TYPE.LISTALL);
}
var selectBranch = (references) => {
    var branches = getBranches(references);
    return inquirer.prompt([{
        type: 'list',
        name: 'branch',
        message: '请选择merged支线',
        choices: [new inquirer.Separator(), ...branches[0], new inquirer.Separator(), ...branches[1]]
    }])
}
var reviewer = [];
var selectReviewer = (branch) => {
    var t = /(origin\/)/.test(branch.branch) ? branch.branch.replace(/(origin\/)/, "") : branch.branch;
    newTagName = generateNewTag(latestTag, t);
    return inquirer.prompt([{
        type: 'checkbox',
        name: 'reviewer',
        message: '请选择reviewer',
        choices: [{
            name: 'chenyan'
        }, {
            name: 'jinhuipeng'
        }, {
            name: 'xuyannan'
        }, {
            name: 'zhangchennan'
        }]
    }])
}
var getMostRecentTagCommit = (answers) => {
    reviewer = answers["reviewer"];
    return repo.getTagByName(latestTag);
};

var getMostRecentCommit = (tag) => {
    tagCommitId = tag.targetId();
    return repo.getBranchCommit("master");
};


var verifyTagCommit = (commit) => {
    mostRecentCommit = commit;
    mostRecentCommitId = commit.id();
    if (mostRecentCommitId.equal(tagCommitId)) {
        console.warn("Current commit hash to the tag is identical:", tagCommitId, mostRecentCommitId);
        return false;
    }
    return commit;
};
// var getTagCommit = () => {
//     return Git.Commit.lookup(repo, tagCommitId);
// };
var tagCommitSHA = [];
var getTagCommitHistory = () => {
    var walker = GitRevwalk.create(repo);
    walker.push(tagCommitId);
    walker.sorting(GitRevwalk.SORT.TIME);
    return walker.getCommitsUntil(function (commit) {
        if (commit.date() > logReadCutoffTime) {
            tagCommitSHA.push(commit.sha());
            return true;
        }
    })
};
var authors = [];
var commitMessages = [];
var getHeadCommitHistory = (commits) => {
    var walker = GitRevwalk.create(repo);
    walker.pushHead();
    walker.sorting(GitRevwalk.SORT.TIME);
    return walker.getCommitsUntil(function (commit) {
        if (commit.date() > logReadCutoffTime) {
            if (tagCommitSHA.indexOf(commit.sha()) === -1) {
                commitMessages.push({
                    message: commit.message().split(os.EOL)[0],
                    time: commit.date()
                });
                authors.push(commit.author().name());
            }
            return true;
        }
    })
};
var setTagMessage = (commits) => {
    var autoGeneratedMessage = autoGenerateTagMessage(commitMessages);
    if (commits) {
        if (autoGeneratedMessage && !isIgnoreAutoGeneratedTagMessage) {
            return autoGeneratedMessage;
        } else {
            if (!autoGeneratedMessage) {
                console.log("自动生成上线内容失败");
            }
            return inquirer.prompt([
                {
                    type: 'editor',
                    name: 'description',
                    message: '上线内容:'
                }
            ]);
        }
    } else {
        return false;
    }
};

var createNewTag = (msg) => {
    if (msg) {
        return GitTag.create(repo, newTagName, mostRecentCommit, Git.Signature.default(repo), tagMessage, 0);
    } else {
        return false;
    }
};


Git.Repository.open(basePath)
    .then(getTagList)
    .then(listBranch)
    .then(selectBranch)
    .then(selectReviewer)
    .then(getMostRecentTagCommit)
    .then(getMostRecentCommit)
    .then(verifyTagCommit)
    .then(getTagCommitHistory)
    .then(getHeadCommitHistory)
    .then(setTagMessage)
    .then((resp) => {
        var msg = _.isObject(resp) ? resp.description : resp;
        var firstLine = `开发人员: ${_.union(authors).join(", ")} ${_.size(reviewer) ? "(review: " + reviewer.join(",") + ")" : ""}`;
        tagMessage = [firstLine, "上线内容: " + msg].join(os.EOL);
        if (resp) {
            console.log("New Tag:", newTagName);
            console.log("Commit Hash:", mostRecentCommit.sha());
            console.log("New Tag Message:");
            console.log(tagMessage);
            return inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'description',
                    message: '确认？:'
                }
            ]);
        } else {
            return false;
        }
    })
    .then(createNewTag)
    .then((val) => {
        if (val) {
            console.log("Done");
        } else {
            console.log("Abort");
        }
        process.exit();
    })
    .catch(function (err) {
        console.log(err)
        console.log("User Abort");
        process.exit();
    });