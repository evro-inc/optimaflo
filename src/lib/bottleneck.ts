import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  minTime: 8000,
});
