/**
 * @file src/utils/concurrency.js
 * 通用的异步并发限制器。
 *
 * 用法:
 *   const limiter = createConcurrencyLimiter(5);
 *   await Promise.all(files.map(file => limiter(() => uploadFile(file))));
 *
 * 同一时刻最多 5 个 uploadFile 在跑,其它排队 FIFO 执行。
 */

/**
 * 创建一个并发限制器。
 *
 * @param {number} maxConcurrent 最大并发数,小于 1 会被纠正为 1
 * @returns {(taskFactory: () => Promise<any>) => Promise<any>}
 *   返回的"执行器"函数:接受一个返回 Promise 的工厂函数,
 *   按容量调度执行,并 resolve/reject 该工厂函数的结果。
 */
export function createConcurrencyLimiter(maxConcurrent) {
    const limit = Math.max(1, Math.floor(maxConcurrent) || 1);
    let activeCount = 0;

    /** @type {Array<{ taskFactory: () => Promise<any>, resolve: Function, reject: Function }>} */
    const waitingQueue = [];

    /**
     * 如果还有空闲槽位,就从队列取下一个任务开始执行。
     */
    function dispatchNextIfPossible() {
        if (activeCount >= limit) return;
        const next = waitingQueue.shift();
        if (!next) return;

        activeCount++;
        Promise.resolve()
            .then(next.taskFactory)
            .then(
                (value) => {
                    activeCount--;
                    next.resolve(value);
                    dispatchNextIfPossible();
                },
                (taskError) => {
                    activeCount--;
                    next.reject(taskError);
                    dispatchNextIfPossible();
                },
            );
    }

    /**
     * @param {() => Promise<any>} taskFactory
     * @returns {Promise<any>}
     */
    return function run(taskFactory) {
        return new Promise((resolve, reject) => {
            waitingQueue.push({ taskFactory, resolve, reject });
            dispatchNextIfPossible();
        });
    };
}
