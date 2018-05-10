#!/usr/bin/env node
const prompts = require('prompts');
const exec = require('child_process').exec;
const request = require('request');
const fs = require('fs');
const colors = require('colors');
const os = require('os');
const download = require('download-git-repo');
const spin = require('io-spin')
const program = require('commander');
const package = require('./package.json');

const source = 'https://raw.githubusercontent.com/chouchou900822/template/master';

function getIPAdress() {
  var interfaces = os.networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];
    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
}

async function downloadFile(folder) {
  return new Promise(function (resolve, reject) {
    download(`chouchou900822/enterprise`, `./${folder}`, function (err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  });
}
async function downloadSingleFile(uri, filename) {
  return new Promise(function (resolve) {
    let stream = fs.createWriteStream(filename);
    request(source + uri).pipe(stream).on('close', resolve());
  });
}

async function get(url) {
  let host = 'http://service.funenc.com/api'
  return new Promise(function (resolve, reject) {
    request(encodeURI(host + url), function (error, response, body) {
      if (error) {
        reject(error)
      } else {
        resolve(JSON.parse(response.body));
      }
    });
  });
}

async function main(folderResponse) {
  let questions = [{
    message: '选择你的项目类型',
    type: 'select',
    name: 'corp',
    choices: [
      { title: '企业微信', value: 'wx' },
      { title: '钉钉', value: 'dd' }
    ],
    initial: 0
  }, {
    message: '选择你的免登类型',
    type: 'select',
    name: 'login',
    choices: [
      { title: '网页授权', value: 'web' },
      { title: '扫码授权', value: 'scan' }
    ],
    initial: 0
  }];
  const response = await prompts(questions);

  let inputs = [{
    type: 'text',
    name: 'userid',
    message: `请输入userid`
  }, {
    type: 'text',
    name: 'appName',
    message: `请输入appName`
  }];

  const envResponse = await prompts(inputs);

  if (envResponse.userid && envResponse.appName) {
    let spinner = spin('代码拉取中...'.green);
    spinner.start();
    await downloadFile(folderResponse.folder);
    spinner.update('80%...');
    await downloadSingleFile(`/${response.corp}/${response.login}/App.vue?v=${Math.random()}`, `./${folderResponse.folder}/client/src/App.vue`);
    spinner.update('85%...');
    await downloadSingleFile(`/${response.corp}/${response.login}/funenc.js?v=${Math.random()}`, `./${folderResponse.folder}/controllers/funenc.js`);
    spinner.update('90%...');
    await downloadSingleFile(`/${response.corp}/${response.login}/index.html?v=${Math.random()}`, `./${folderResponse.folder}/client/public/index.html`);
    spinner.update('95%...');
    await downloadSingleFile(`/${response.corp}/${response.login}/index.js?v=${Math.random()}`, `./${folderResponse.folder}/routes/index.js`);
    spinner.update('100%...');
    spinner.stop();
    console.log('代码下载成功...'.green);

    let envSpinner = spin('环境变量配置中...'.green);
    envSpinner.start();
    let ip = getIPAdress();
    envResponse.host = `http://${ip}:3000`;
    let serviceRes = await get(`/admins/info?corp=${response.corp}&login=${response.login}&userid=${envResponse.userid}&appName=${envResponse.appName}`);
    let envFileContent = '';
    for (let key in envResponse) {
      envFileContent += `VUE_APP_${key}=${envResponse[key]}\n`;
    }
    for (let key in serviceRes) {
      envFileContent += `VUE_APP_${key}=${serviceRes[key]}\n`;
    }
    exec(`echo "${envFileContent}" > ./${folderResponse.folder}/client/.env.development`, function (error, stdout, stderr) {
      if (error !== null) {
        console.log('exec error: ' + error);
      } else {
        envSpinner.stop();
        console.log('环境变量配置完成...'.green);
        console.log('项目创建完毕...'.green);
      }
    });
  }
}
program
  .version(package.version)
  .command('create [name]')
  .description('新建一个项目')
  .action(async function (name) {
    await main({
      folder: name
    });
  });
program.parse(process.argv);