import { data } from './data';

export class App {
  getData() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(data);
      }, 50);
    });
  }
}
