import Bottleneck from 'bottleneck';

export const limiter = new Bottleneck({
  maxConcurrent: 1,
  minTime: 4000, // One request every 4 seconds (adjust to fit the QPS limit)
});
