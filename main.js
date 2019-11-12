const inquirer = require('inquirer');

const IMAPClient = require('./src/IMAPClient');

async function main() {
    const username = process.env.USERNAME;
    const password = process.env.PASSWORD;
    const host = process.env.HOST;

    const imapClient = new IMAPClient(username, password, host);
    const boxes = await imapClient.getBoxes();
    const boxPath = await askBoxPath(boxes);
    const messages = await imapClient.getMessages(boxPath, 1, 1);

    console.log(JSON.stringify(messages, null, 2));
}

async function askBoxPath(boxes) {
    const result = await inquirer.prompt([
      {
          type: 'list',
          name: 'box',
          message: 'Select a box:',
          choices: getBoxesPaths(boxes)
      }
    ]);
    return result.box;
}

function getBoxesPaths(boxes) {
    let result = [];
    boxes.forEach(b => {
        result.push(b.path);
        result = result.concat(getBoxesPaths(b.children));
    });
    return result;
}

main().then(() => {}, (err) => console.log(err));
