import axios from 'axios';
import util from 'util';

async function main() {
    let mainURL = 'http://localhost:3000'
    // Usually stored in a .env file
    let credentials = {
        "login": "BankinUser",
        "password": "12345678",
        "clientId": "BankinClientId",
        "clientSecret": "secret"
    }

    let res = await axios.post(mainURL + '/login', {
        user: credentials.login,
        password: credentials.password
    }, {
        auth: {
            username: credentials.clientId.toString("base64"),
            password: credentials.clientSecret.toString("base64")
        }
    }).catch(err => {
        if (err.code === 'ECONNREFUSED') {
            console.log('local-server is not running')
            return
        }
    })

    if (!res) return

    let refresh_token = res.data.refresh_token;

    if (!refresh_token) {
        console.log('Error: no token');
        return;
    }

    let params = new URLSearchParams();
    params.append('grant_type', "refresh_token");
    params.append('refresh_token', refresh_token);
    res = await axios.post(mainURL + '/token', params).catch(err => {
        console.log(err);
    })

    let access_token = res.data.access_token;

    let accountsRes = await axios.get(mainURL + '/accounts', {
        headers: {
            Authorization: 'Bearer ' + access_token
        }
    }).catch(err => {
        console.log(err);
    })
    if (!accountsRes) return
    let accounts = accountsRes.data.account;

    async function recursive(res) {
        if (!res.data.link.next) return next()

        let nextPageRes = await axios.get(mainURL + res.data.link.next, {
            headers: {
                Authorization: 'Bearer ' + access_token
            }
        }).catch((err) => {
            console.log(err);
        })

        if (!nextPageRes) return next()


        nextPageRes.data.account.forEach(account => {
            if (accounts.find(acc => acc.acc_number === account.acc_number)) return
            accounts.push(account)
        })
        if (nextPageRes.data.link.next !== res.data.link.next) return recursive(nextPageRes)
        next()
    }
    recursive(accountsRes)

    function next() {
        let result = [];

        let i = 0
        accounts.forEach(async account => {
            i++
            console.log(i + ' / ' + accounts.length)
            let transactions = await axios.get(mainURL + `/accounts/${account.acc_number}/transactions`, { headers: { Authorization: 'Bearer ' + access_token } }).then(res => {
                if (!res.data.transactions) return
                return res.data.transactions
            }).catch(err => { return [] })
            result.push({
                acc_number: account.acc_number,
                amount: account.amount,
                transactions: transactions
            })
            if (result.length === accounts.length) console.log(util.inspect(result, false, null, true))
        })
    }
}
main();