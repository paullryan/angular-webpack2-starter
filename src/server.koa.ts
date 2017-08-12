/* tslint:disable no-console */
import 'zone.js/dist/zone-node';
import './polyfills.server';
import './rxjs.imports';

import * as fs from 'fs';
import * as path from 'path';

import * as http from 'spdy';
import * as chalk from 'chalk';

import * as Koa from 'koa';
import * as compress from 'koa-compress';
import * as serve from 'koa-static';
import * as Router from 'koa-router';
import * as mount from 'koa-mount';
import * as morgan from 'koa-morgan';
import * as Boom from 'boom';

// import * as hmrMiddleware from 'koa2-hmr-middleware';
// import * as webpack from 'webpack';

import { enableProdMode } from '@angular/core';
import { platformServer, renderModuleFactory } from '@angular/platform-server';

import { routes } from './server.routes';
import { ServerAppModule } from './app/server.app.module';
import { ngKoaEngine } from './ng-koa-engine';
import { UNIVERSAL_PORT } from '../constants';
import { App } from './mock-api/app';

const app = new Koa();
const api = new App();
// const webpackConfig = require('../webpack.config.ts');
const serverRoot = 'https://localhost:' + UNIVERSAL_PORT;

// const webpackCompiler = webpack(webpackConfig);

enableProdMode();

const httpOptions = {
  key: fs.readFileSync(path.join(__dirname, '..', 'localhost.key')),
  cert: fs.readFileSync(path.join(__dirname, '..', 'localhost.crt'))
};

const mainRouter = new Router();

app.use(compress());

// app.use(hmrMiddleware(webpackCompiler, {
//     dev: webpackConfig,
//     hot: webpackConfig
// }));

app.use(ngKoaEngine(path.join(__dirname), {
    bootstrap: ServerAppModule
  })
);

if (process.env.NODE_ENV !== 'development') {
  const accessLogStream = fs.createWriteStream(__dirname + '/access.log', { flags: 'a' });
  app.use(morgan('combined', { stream: accessLogStream }));
} else {
  app.use(morgan('dev'));
}

app.use(mount('/', serve(path.join(__dirname, '..', 'dist'), {index: false})));

console.log('Initializing angular root routes:');
routes.forEach(route => {
  console.log(`  ↳ ${serverRoot}/${chalk.magenta(route)}`);
  mainRouter.get('/' + route, async (ctx, next) => {
    console.log('here');
    try {
      await ctx.render('index', {
        ctx: ctx
      });
    } catch (error) {
      console.error(error);
    }
  });
});

mainRouter.get('/data', async (ctx, next) => {
  ctx.body = await api.getData();
});

app
  .use(mainRouter.routes())
  .use(mainRouter.allowedMethods(<any>{
    throw: true,
    notImpemented: () => Boom.notImplemented(),
    methodNotAllowed: () => Boom.methodNotAllowed()
  }));

http.createServer(httpOptions, app.callback()).listen(UNIVERSAL_PORT, () => {
  console.log(`Started server at ${chalk.green(serverRoot)}`);
});
