const Imap = require('imap');

class IMAPClient {
    constructor(user, password, host) {
        this.imap = new Imap({
            user,
            password,
            host,
            port: 993,
            tls: true
        });
        this.readinessPromise = new Promise((resolve) => {
            this.imap.once('ready', () => resolve());
        });
        this.imap.once('error', function (err) {
            console.log(err);
        });
        this.imap.once('end', function () {
            console.log('Connection ended');
        });
        this.imap.connect();
    }

    async ready() {
        await this.readinessPromise;
    }

    async getBoxes() {
        await this.ready();
        const boxes = await getBoxes(this.imap);
        return parseBoxes(boxes);
    }

    async getMessages(boxPath, _amount, _startFrom) {
        const amount = _amount === undefined ? 5 : _amount;
        const startFrom = _startFrom === undefined ? 1 : _startFrom;

        await openBox(this.imap, boxPath);

        const messages = getMessages(this.imap, `${startFrom}:${amount}`);
        return messages;
    }

    close() {
        this.imap.end();
    }
}

function getBoxes(imap) {
    return new Promise((resolve, reject) => {
        imap.getBoxes((err, boxes) => {
            if (err) { reject(err); return; }
            resolve(boxes);
        });
    });
}

function parseBoxes(boxes, _parentPath) {
    const parentPath = _parentPath || '';
    const result = [];
    Object.keys(boxes).forEach(key => {
        const box = boxes[key];
        const currentPath = parentPath ? `${parentPath}${key}` : key;
        result.push({
            name: key,
            path: currentPath,
            children: box.children ? parseBoxes(box.children, currentPath + box.delimiter) : []
        })
    });
    return result;
}

function openBox(imap, boxPath) {
    return new Promise((resolve, reject) => {
        imap.openBox(boxPath, true, (err, box) => {
            if (err) { reject(err); return; }
            resolve(box);
        })
    });
}

function getMessages(imap, selector) {
    return new Promise((resolve, reject) => {

        const result = [];

        const fetch = imap.seq.fetch(selector, {
            bodies: 'HEADER',
            struct: true
        });
    
        fetch.on('message', function (msg, seqno) {
            const message = {};
            msg.on('body', function (stream, info) {
                var buffer = '';
                stream.on('data', function (chunk) {
                    buffer += chunk.toString('utf8');
                });
                stream.once('end', function () {
                    message.header = Imap.parseHeader(buffer);
                });
            });
            msg.once('attributes', function (attrs) {
                message.attributes = attrs;
            });
            msg.once('end', function () {
                result.push(message);
            });
        });
        fetch.once('error', function (err) {
            reject(err);
        });
        fetch.once('end', function () {
            resolve(result);
        });

    });
}

module.exports = IMAPClient;
