import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  minTime: 4050, // One request every 4 seconds
});
