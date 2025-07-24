import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import * as http from 'http';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  
  private httpGet(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (err) => {
        reject(err);
      });
    });
  }

  @Get('/machines')
  async getMachines() {
    try {
      const data = await this.httpGet('http://localhost:3000/api/machines');
      return data;
    } catch (error) {
      console.error('Error fetching from Edge Gateway:', error.message);
      return { error: 'Failed to fetch data' };
    }
  }
}
