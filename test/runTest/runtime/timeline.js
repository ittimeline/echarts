/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

if (typeof __VST_PLAYBACK_SPEED__ === 'undefined') {
    window.__VST_PLAYBACK_SPEED__ = 1;
}
const nativeRaf = window.requestAnimationFrame;
const FIXED_FRAME_TIME = 16;
const MAX_FRAME_TIME = 80;
const TIMELINE_START = 1566458693300;

window.__VST_TIMELINE_PAUSED__ = true;

let realFrameStartTime = 0;

/** Control timeline loop */
let rafCbs = [];
let frameIdx = 0;
let timelineTime = 0;
function timelineLoop() {
    if (!__VST_TIMELINE_PAUSED__) {
        realFrameStartTime = NativeDate.now();
        frameIdx++;
        timelineTime += FIXED_FRAME_TIME;
        const currentRafCbs = rafCbs;
        // Clear before calling the callbacks. raf may be registered in the callback
        rafCbs = [];
        currentRafCbs.forEach((cb) => {
            cb();
        });
        flushTimeoutHandlers();
        flushIntervalHandlers();
    }
    nativeRaf(timelineLoop);
}
nativeRaf(timelineLoop);

window.requestAnimationFrame = function (cb) {
    rafCbs.push(cb);
};

/** Mock setTimeout, setInterval */
let timeoutHandlers = [];
let intervalHandlers = [];

let timeoutId = 1;
let intervalId = 1;
window.setTimeout = function (cb, timeout) {
    const elapsedFrame = Math.ceil(Math.max(timeout || 0, 1) / FIXED_FRAME_TIME);
    timeoutHandlers.push({
        callback: cb,
        id: timeoutId,
        frame: frameIdx + elapsedFrame
    });

    return timeoutId++;
}

window.clearTimeout = function (id) {
    const idx = timeoutHandlers.findIndex(handler => {
        handler.id === id
    });
    if (idx >= 0) {
        timeoutHandlers.splice(idx, 1);
    }
}

function flushTimeoutHandlers() {
    let newTimeoutHandlers = [];
    for (let i = 0; i < timeoutHandlers.length; i++) {
        const handler = timeoutHandlers[i];
        if (handler.frame === frameIdx) {
            handler.callback();
        }
        else {
            newTimeoutHandlers.push(handler);
        }
    }
    timeoutHandlers = newTimeoutHandlers;
}

window.setInterval = function (cb, interval) {
    const intervalFrame = Math.ceil(Math.max(interval || 0, 1) / FIXED_FRAME_TIME);
    intervalHandlers.push({
        callback: cb,
        id: intervalId,
        intervalFrame,
        frame: frameIdx + intervalFrame
    })

    return intervalId++;
}

window.clearInterval = function () {
    const idx = intervalHandlers.findIndex(handler => {
        handler.id === id
    });
    if (idx >= 0) {
        intervalHandlers.splice(idx, 1);
    }
}

function flushIntervalHandlers() {
    for (let i = 0; i < intervalHandlers.length; i++) {
        const handler = intervalHandlers[i];
        if (handler.frame === frameIdx) {
            handler.callback();
            handler.frame += handler.intervalFrame;
        }
    }
}

/** Mock Date */

const NativeDate = window.Date;

const mockNow = function () {
    // Use same time in one frame.
    return TIMELINE_START + timelineTime * window.__VST_PLAYBACK_SPEED__;
};
function MockDate(...args) {
    if (!args.length) {
        return new NativeDate(mockNow());
    }
    else {
        return new NativeDate(...args);
    }
}
MockDate.prototype = Object.create(NativeDate.prototype);
Object.setPrototypeOf(MockDate, NativeDate);
MockDate.now = mockNow;

window.Date = MockDate;


export function start() {
    window.__VST_TIMELINE_PAUSED__ = false;
}

export function pause() {
    window.__VST_TIMELINE_PAUSED__ = true;
}

export function resume() {
    window.__VST_TIMELINE_PAUSED__ = false;
}