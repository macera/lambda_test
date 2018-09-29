'use strict';

const logFilePath = './github-webhook.log';
const PORT = '7777';
const SECRET = process.env.WEBHOOK_SECRET || 'secret'; // ソース上にsecretがあるのはあれなので環境変数にしておくと良いかもっていう
const REPOSITORY_NAME = 'macera/stock'; // よしなに変えて
const errorMessages = {
    noMatch: 'not match repository or branch'
};

const fs = require('fs');
const http = require('http');
const exec = require('child_process').exec;
const createHandler = require('github-webhook-handler');
const handler = createHandler({
    path: '/webhook',
    secret: SECRET
});

const writeLog = (data) => {
    fs.appendFileSync(logFilePath, data+"\n", (err) => {
        if (err) {
            writeLog(JSON.stringify({error: err})+"\n");
            throw err;
        }
    });
}

http.createServer((req, res) => {
    handler(req, res, function (err) {
      res.statusCode = 404;
      res.end('no such location');
    })
  }).listen(PORT);

handler.on('error', (err) => {
    writeLog(err.message);
});

handler.on('push', (e) => {
    const payload = e.payload;
    const repoName = payload.repository.name;
    const branch = payload.ref.split("/").pop();
    let log = {
        pull: {
            error: '',
            stdout: ''
        },
        restart: {
            error: '',
            stdout: ''
        }
    };

    // リポジトリの確認とmasterが更新されたらっていう判断
    if (repoName !== REPOSITORY_NAME && branch !== 'master') {
        writeLog(JSON.stringify({ error: errorMessages.noMatch }));
        return;
    }

    // んで最後に反映する処理をよしなに書いておく...
    exec('git pull origin master', (err, stdout, stderr) => {
        if (err) { log.pull.error = err }
        log.pull.stdout = stdout;
        writeLog(JSON.stringify(log));

        exec('npm install', (err, stdout, stderr) => {
            if (err) { log.pull.error = err }
            log.pull.stdout = stdout;
            writeLog(JSON.stringify(log));

            exec('forever restart app.js', (err, stdout, stderr) => {
                if (err) { log.restart.error = err }
                log.restart.stdout = stdout;
                writeLog(JSON.stringify(log));
            });
        });
    });
});