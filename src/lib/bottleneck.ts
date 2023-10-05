import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  minTime: 5000, // One request every 5 seconds
});
