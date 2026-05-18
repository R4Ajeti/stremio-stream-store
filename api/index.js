import { BuildApp } from '../src/app.js';
const AppPromise = BuildApp().then(async (App) => {
    await App.ready();
    return App;
});
export default async function Handler(RequestObj, ReplyObj) {
    try {
        const App = await AppPromise;
        App.server.emit('request', RequestObj, ReplyObj);
    }
    catch (ErrorObj) {
        console.error('Vercel handler failed:', ErrorObj);
        if (!ReplyObj.headersSent) {
            ReplyObj.statusCode = 500;
            ReplyObj.setHeader('Content-Type', 'application/json');
        }
        ReplyObj.end(JSON.stringify({
            ok: false,
            error: 'Internal Server Error',
        }));
    }
}
