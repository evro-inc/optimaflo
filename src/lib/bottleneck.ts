import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  minTime: 8000, // One request every 8 milliseconds
});
