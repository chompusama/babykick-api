/**
 *  @POST
 *  timer for sadovsky, 3 meals
 *  push message to line when time out
 *  fix time for use sdk
 *   
 *  body required
 *      line_id : string
 *      time : 00:00:00
 * 
 *  Created by CPU on 25/9/19
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const line = require('@line/bot-sdk');
const cron = require('node-cron');

const dataCollection = require("../models/dataModel");


router.post("/", (req, res, next) => {

    var availableTime = false;

    dataCollection.findOne({ line_id: req.body.line_id })
        .exec()
        .then(docs => {

            if (docs == null || docs == "") {
                res.json({
                    status: 'error',
                    message: 'line id is invalid',
                });
            }
            else {
                var countingLength = docs.counting.length;
                var week = Math.ceil(countingLength / 7);
                var day = countingLength % 7;

                var currentDay;
                var currentWeek;
                var _did = (week.toString() + 'w' + day.toString() + 'd').toString();
                var d = new Date(); // for now
                var timestamp = Date.now(); // for now

                var hr = (7 + d.getHours()) % 24;
                var min = d.getMinutes();
                var sec = d.getSeconds();
                var endHr = (19 + d.getHours()) % 24;

                if (hr < 10) hr = '0' + hr;                // add string '0' in front of number 
                if (min < 10) min = '0' + min;
                if (sec < 10) sec = '0' + sec;

                var date = new Date(Date.now());
                var time = date.toLocaleTimeString('en-TH', { hour12: false }); / new time version /
                var end_time = endHr.toString() + ':' + min.toString() + ':' + min.toString();

                console.log('now time is > ', time);

                Date.prototype.getWeek = function () {
                    var dt = new Date(this.getFullYear(), 0, 1);
                    return Math.ceil((((this - dt) / 86400000) + dt.getDay() + 1) / 7);
                };
                var week_by_date = date.getWeek();

                if (docs.timer_status == 'timeout' && docs.sdk_status == 'enable') {
                    if (countingLength == 0) {                                  // if there isn't counting data before
                        newDay('1', '1', date, time, timestamp, end_time, week_by_date);
                    }
                    else {

                        if (docs.counting[countingLength - 1].status == 'close') {      // previos array is close, start new counting array
                            if (day == 0) {                             //start new week

                                currentWeek = (week + 1).toString();
                                checkAvailableTime('close', req.body.time);
                                if (availableTime == true) {
                                    newDay(currentWeek, '1', date, time, timestamp, end_time, week_by_date);
                                }
                                else {
                                    res.json({
                                        message: 'sdk is unavailable'
                                    });
                                }
                            }
                            else {

                                currentDay = (day + 1).toString();      // start new day
                                checkAvailableTime('close', req.body.time);
                                if (availableTime == true) {
                                    newDay(week.toString(), currentDay, date, time, timestamp, end_time, week_by_date);
                                }
                                else {
                                    res.json({
                                        message: 'sdk is unavailable',
                                    });
                                }
                            }
                        }
                        else if (docs.counting[countingLength - 1].status == '1st') {

                            checkAvailableTime('1st', req.body.time);
                            if (availableTime == true) {
                                newMeal('2nd', _did, date, time, timestamp, end_time);
                            }
                            else {
                                res.json({
                                    message: 'sdk is unavailable',
                                });
                            }
                        }
                        else if (docs.counting[countingLength - 1].status == '2nd') {

                            checkAvailableTime('2nd', req.body.time);
                            if (availableTime == true) {
                                newMeal('3rd', _did, date, time, timestamp, end_time);
                            }
                            else {
                                res.json({
                                    message: 'sdk is unavailable',
                                });
                            }
                        }
                        else {
                            console.log(docs.counting[countingLength - 1].status);
                        }

                    }
                }
                else {
                    res.json({
                        status: 0000,
                        timer_status: docs.timer_status,
                        sdk_status: docs.sdk_status,
                        message: 'can not run timer sdk, status have to be timeout and enable'
                    });
                }

            }
        }).catch(err => {
            console.log(err)
            res.json({
                message: 'line id not found.',
            });
        });


    function newDay(currentWeek, currentDay, date, time, timestamp, end_time, week_by_date) {

        // closeAutomatic();
        dataCollection.updateOne({ line_id: req.body.line_id }, {
            $set: {
                timer_status: "running",
                count_type: 'sdk',
            },
            $push: {
                counting: {
                    week_by_date: week_by_date,
                    week: currentWeek,
                    day: currentDay,
                    _did: currentWeek + 'w' + currentDay + 'd',
                    date: date,
                    time: time,
                    timestamp: timestamp,
                    count_type: 'SDK',
                    sdk_first_meal: 0,
                    sdk_second_meal: 0,
                    sdk_third_meal: 0,
                    sdk_extra_meal: 0,
                    sdk_all_meal: 0,
                    result: '',
                    status: '1st'
                }
            }
        }, function (err, docs) {
            console.log(err)
            console.log('add new day successfully!');
            res.json({
                status: 'success',
                meal: '1st',
                date: date,
                time: time,
                timestamp: timestamp,
                end_time: end_time
            });
        });

        / 1st /
        setTimeout(function () {
            availableTime = false;
            dataCollection.findOne({ line_id: req.body.line_id })
                .exec()
                .then(docs => {
                    var countingLength = docs.counting.length;
                    var latestCounting = countingLength - 1;
                    var _did = docs.counting[latestCounting]._did;

                    // check counting amount and then push message
                    if (docs.counting[countingLength - 1].timer_status == 'timeout' && docs.counting[countingLength - 1].status == 'close') {
                        console.log('set time out 1st : closed')
                    }
                    else if (docs.counting[countingLength - 1].sdk_first_meal >= 3 && docs.counting[countingLength - 1].sdk_first_meal < 10) {    // good 

                        checkAvailableTimeAutomatic('1st');

                        dataCollection.findOneAndUpdate({ line_id: req.body.line_id, 'counting._did': _did }, {
                            $set: {
                                timer_status: "timeout",
                                sdk_status: "enable",
                                count_type: 'sdk',
                                extra: 'disable',
                            },
                        }, function (err, docs) {
                            console.log(err)
                            console.log('1st meal time out >> greater than or equal to 3, see u in 2nd meal')
                        });

                        / push message to line */
                        const client = new line.Client({
                            channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
                        });
                        const message = [
                            {
                                type: 'text',
                                text: '👍เยี่ยมมากค่ะคุณแม่ ลูกดิ้นดี 👶🏻😁'
                            },
                            {
                                type: 'text',
                                text: 'คุณแม่อย่าลืมกลับมานับต่อหลังรับประทานมื้อเที่ยงนะคะ 🍽'
                            },
                            {
                                type: "sticker",
                                packageId: 3,
                                stickerId: 184
                            }
                        ]
                        client.pushMessage(lineId, message)
                            .then(() => {
                                console.log('push message 1st done!')
                            })
                            .catch((err) => {
                                console.log(err);   // error when use fake line id 
                            });

                        var getDate = new Date(Date.now()).getDate();
                        var getMonth = new Date(Date.now()).getMonth() + 1;
                        let sScheduleLunch = '30 11 ' + getDate + ' ' + getMonth + ' *';

                        cron.schedule(sScheduleLunch, () => {
                            console.log('Runing a job  at Asia/Bangkok timezone');

                            / push message to line */
                            const client = new line.Client({
                                channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
                            });
                            const message = [
                                {
                                    type: 'text',
                                    text: 'เที่ยงแล้ว อย่าลืมมานับ Sadovsky ต่อนะคะ'
                                },
                            ]
                            client.pushMessage(lineId, message)
                                .then(() => {
                                    console.log('corn : push lunch message done!')
                                })
                                .catch((err) => {
                                    console.log(err);   // error when use fake line id 
                                });
                        }, {
                                scheduled: true,
                                timezone: "Asia/Bangkok"
                            });
                    }
                    else if (docs.counting[countingLength - 1].sdk_first_meal < 3) { // amount != 3, go to ctt
                        dataCollection.findOneAndUpdate({ line_id: req.body.line_id, 'counting._did': _did }, {
                            $set: {
                                timer_status: "timeout",
                                sdk_status: "disable",
                                extra: 'ctt',
                                count_type: 'ctt',
                                'counting.$.result': 'มีความเสี่ยง',
                            },
                        }, function (err, docs) {
                            console.log(err)
                            console.log('1st meal time out! please go to ctt')
                        });

                        / push message to line */
                        const client = new line.Client({
                            channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
                        });
                        const message = [
                            {
                                type: 'text',
                                text: '🌞 เช้านี้นับครบ 1 ชั่วโมงแล้ว 🕤 แต่ลูกคุณแม่ดิ้นไม่ครบ 3 ครั้ง 😞'
                            },
                            {
                                type: 'text',
                                text: '📢 แนะนำให้คุณแม่กลับไปกระตุ้นปลุกลูกแล้วมาเริ่มนับใหม่ โดยใช้วิธี Count to ten นะคะ 😁😁'
                            },
                            {
                                type: 'text',
                                text: '✳️ วิธีกระตุ้นปลุกลูก 👶🏻😀 \n📍ขยับตัว เปลี่ยนท่าทาง 🚶‍♀️ \n📍รับประทานอาหารว่างหรือดื่มน้ำเย็น แล้วรอสัก 2 – 3 นาที 🍉🍍 \n📍นวดเบาๆ หรือลูบท้อง 🤰🏻 \n📍ใช้ไฟฉายส่องที่หน้าท้อง🔦"'
                            },
                            {
                                type: "sticker",
                                packageId: 3,
                                stickerId: 190
                            }
                        ]
                        client.pushMessage(req.body.line_id, message)
                            .then(() => {
                                console.log('push message go to ctt done!')
                            })
                            .catch((err) => {
                                console.log(err);   // error when use fake line id 
                            });
                    }

                }).catch(err => {
                    console.log(err)
                    res.status(200).json({
                        account: false,
                        message: 'line id not found.',
                    });
                });
        }, 60000); / <----------------------------------------- set time */
    }


    function newMeal(meal, _did, date, time, timestamp, end_time) {
        console.log('start sdk ' + meal);

        dataCollection.findOne({ line_id: req.body.line_id }, function (err, docs) {
            dataCollection.updateOne({ line_id: req.body.line_id, 'counting._did': _did }, {
                $set: {
                    timer_status: 'running',
                    'counting.$.status': meal,
                    'counting.$.time': time
                }
            }, function (err, docs) {
                console.log(err);
                res.json({
                    status: 'success',
                    meal: meal,
                    date: date,
                    time: time,
                    timestamp: timestamp,
                    end_time: end_time
                });
            });
        });

        / 2nd & 3rd/
        setTimeout(function () {
            availableTime = false;
            if (meal == '2nd') {
                dataCollection.findOne({ line_id: req.body.line_id })
                    .exec()
                    .then(docs => {
                        var _dids = docs.counting[(docs.counting.length) - 1]._did;

                        if (docs.counting[(docs.counting.length) - 1].timer_status == 'timeout' && docs.counting[(docs.counting.length) - 1].status == 'close') {
                            console.log('set time out 2nd : closed')
                        }
                        else if (docs.counting[(docs.counting.length) - 1].sdk_second_meal >= 3 && docs.counting[(docs.counting.length) - 1].sdk_second_meal < 10) {

                            checkAvailableTimeAutomatic('2nd');

                            dataCollection.findOneAndUpdate({ line_id: req.body.line_id, 'counting._did': _did }, {
                                $set: {
                                    timer_status: "timeout",
                                    sdk_status: "enable",
                                    extra: 'disable',
                                    count_type: 'sdk',
                                },
                            }, function (err, docs) {
                                console.log(err)
                                console.log('2st meal time out >> greater than or equal to 3, see u in 3nd meal')
                            });

                            / push message to line */
                            const client = new line.Client({
                                channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
                            });
                            const message = [
                                {
                                    type: 'text',
                                    text: '👍เยี่ยมมากค่ะคุณแม่ ลูกดิ้นดี 👶🏻😁'
                                },
                                {
                                    type: 'text',
                                    text: 'คุณแม่อย่าลืมกลับมานับต่อหลังรับประทานมื้อเย็นนะคะ 🍽'
                                },
                                {
                                    type: "sticker",
                                    packageId: 3,
                                    stickerId: 184
                                }
                            ]
                            client.pushMessage(lineId, message)
                                .then(() => {
                                    console.log('push message 2nd done!')
                                })
                                .catch((err) => {
                                    console.log(err);   // error when use fake line id 
                                });

                            var getDate = new Date(Date.now()).getDate();
                            var getMonth = new Date(Date.now()).getMonth() + 1;
                            let sScheduleDinner = '0 17 ' + getDate + ' ' + getMonth + ' *';

                            cron.schedule(sScheduleDinner, () => {
                                console.log('Runing a job  at Asia/Bangkok timezone');

                                / push message to line */
                                const client = new line.Client({
                                    channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
                                });
                                const message = [
                                    {
                                        type: 'text',
                                        text: 'เย็นแล้ว อย่าลืมมานับ Sadovsky ต่อนะคะ'
                                    },
                                ]
                                client.pushMessage(lineId, message)
                                    .then(() => {
                                        console.log('corn : push dinner message done!')
                                    })
                                    .catch((err) => {
                                        console.log(err);   // error when use fake line id 
                                    });
                            }, {
                                    scheduled: true,
                                    timezone: "Asia/Bangkok"
                                });
                        }
                        else if ((docs.counting[(docs.counting.length) - 1].sdk_second_meal < 3)) { // amount != 3, go to ctt
                            dataCollection.findOneAndUpdate({ line_id: req.body.line_id, 'counting._did': _dids }, {
                                $set: {
                                    timer_status: "timeout",
                                    sdk_status: "disable",
                                    extra: 'ctt',
                                    count_type: 'ctt',
                                    'counting.$.result': 'มีความเสี่ยง',
                                },
                            }, function (err, docs) {
                                console.log(err)
                                console.log('2nd meal time out! please go to ctt')
                            });

                            / push message to line */
                            const client = new line.Client({
                                channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
                            });
                            const message = [
                                {
                                    type: 'text',
                                    text: '🌞 เที่ยงนี้นับครบ 1 ชั่วโมงแล้ว 🕤 แต่ลูกคุณแม่ดิ้นไม่ครบ 3 ครั้ง 😞'
                                },
                                {
                                    type: 'text',
                                    text: '📢 แนะนำให้คุณแม่กลับไปกระตุ้นปลุกลูกแล้วมาเริ่มนับใหม่ โดยใช้วิธี Count to ten นะคะ 😁😁'
                                },
                                {
                                    type: 'text',
                                    text: '✳️ วิธีกระตุ้นปลุกลูก 👶🏻😀 \n📍ขยับตัว เปลี่ยนท่าทาง 🚶‍♀️ \n📍รับประทานอาหารว่างหรือดื่มน้ำเย็น แล้วรอสัก 2 – 3 นาที 🍉🍍 \n📍นวดเบาๆ หรือลูบท้อง 🤰🏻 \n📍ใช้ไฟฉายส่องที่หน้าท้อง🔦"'
                                },
                                {
                                    type: "sticker",
                                    packageId: 3,
                                    stickerId: 190
                                }
                            ]
                            client.pushMessage(req.body.line_id, message)
                                .then(() => {
                                    console.log('push message go to ctt done!')
                                })
                                .catch((err) => {
                                    console.log(err);   // error when use fake line id 
                                });
                        }


                    }).catch(err => {
                        console.log(err)
                        res.status(200).json({
                            account: false,
                            message: 'line id not found.',
                        });
                    });
            }
            else if (meal == '3rd') {
                dataCollection.findOne({ line_id: req.body.line_id })
                    .exec()
                    .then(docs => {
                        var _dids = docs.counting[(docs.counting.length) - 1]._did;

                        if (docs.timer_status == 'timeout' && docs.counting[(docs.counting.length) - 1].status == 'close') {
                            console.log('set time out 3rd : closed')
                        }
                        else if (docs.counting[(docs.counting.length) - 1].sdk_all_meal < 10) { // go to extra

                            var d = new Date(Date.now());
                            var hr = (7 + d.getHours()) % 24;
                            var min = d.getMinutes();
                            var sec = d.getSeconds();
                            if (hr < 10) hr = '0' + hr;
                            if (min < 10) min = '0' + min;
                            if (sec < 10) sec = '0' + sec;
                            var time = hr.toString() + ':' + min.toString() + ':' + sec.toString();

                            dataCollection.findOneAndUpdate({ line_id: req.body.line_id, 'counting._did': _dids }, {
                                $set: {
                                    timer_status: "running",
                                    sdk_status: "enable",
                                    extra: 'enable',
                                    count_type: 'sdk',
                                    'counting.$.status': 'extra',
                                    'counting.$.time': time,
                                },
                            }, function (err, docs) {
                                console.log(err)
                                console.log('3rd meal time out! please go to extra')
                            });

                            / push message to line */
                            const client = new line.Client({
                                channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
                            });
                            const message = [
                                {
                                    type: 'text',
                                    text: '🌞 เย็นนี้นับครบ 1 ชั่วโมงแล้ว 🕛 แต่ลูกคุณแม่ดิ้นไม่ครบ 3 ครั้ง 😞'
                                },
                                {
                                    type: 'text',
                                    text: 'คุณแม่นับต่ออีก 1 ชั่วโมงนะคะ'
                                },
                            ]
                            client.pushMessage(req.body.line_id, message)
                                .then(() => {
                                    console.log('push message go to extra done!')
                                })
                                .catch((err) => {
                                    console.log(err);   // error when use fake line id 
                                });

                            / ==== extra automatic ====/
                            setTimeout(function () {
                                dataCollection.findOne({ line_id: req.body.line_id })
                                    .exec()
                                    .then(docs => {
                                        if (docs.timer_status == 'timeout' && docs.counting[(docs.counting.length) - 1].status == 'close') {   // amount = 10 already
                                            console.log('set time out 3rd extra : closed')
                                        }
                                        else if (docs.timer_status == 'running') {
                                            if (docs.counting[(docs.counting.length) - 1].sdk_all_meal >= 10) {
                                                pushMessage('success');
                                                dataCollection.findOneAndUpdate({ line_id: req.body.line_id, 'counting._did': _dids }, {
                                                    $set: {
                                                        timer_status: "timeout",
                                                        sdk_status: "enable",
                                                        extra: 'disable',
                                                        count_type: 'any',
                                                        'counting.$.result': 'ลูกดิ้นดี',
                                                    },
                                                }, function (err, docs) {
                                                    console.log(err)
                                                    console.log('3rd meal time out! please go to extra')
                                                });
                                            }
                                            else if (docs.counting[(docs.counting.length) - 1].sdk_all_meal < 10) {
                                                pushMessage('failed');
                                                dataCollection.findOneAndUpdate({ line_id: req.body.line_id, 'counting._did': _dids }, {
                                                    $set: {
                                                        timer_status: "timeout",
                                                        sdk_status: "enable",
                                                        extra: 'disable',
                                                        count_type: 'any',
                                                        'counting.$.result': 'มีความเสี่ยง',
                                                    },
                                                }, function (err, docs) {
                                                    console.log(err)
                                                    console.log('3rd meal time out! please go to extra')
                                                });
                                            }
                                        }

                                    }).catch(err => {
                                        console.log(err)
                                        res.status(200).json({
                                            account: false,
                                            message: 'line id not found.',
                                        });
                                    });
                            }, 60000);
                        }

                    }).catch(err => {
                        console.log(err)
                        res.status(200).json({
                            account: false,
                            message: 'line id not found.',
                        });
                    });
            }
        }, 60000); / <----------------------------------------- set time */
    }


    function pushMessage(state) {
        if (state == 'success') {
            / push message to line */
            const client = new line.Client({
                channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
            });
            const message = [
                {
                    type: 'text',
                    text: '👍เยี่ยมมากค่ะคุณแม่ ลูกดิ้นดี👶🏻😁'
                },
                {
                    type: 'text',
                    text: 'วันนี้คุณแม่นับลูกดิ้นเรียบร้อยแล้ว กลับมานับใหม่พรุ่งนี้นะคะ'
                },
                {
                    type: "sticker",
                    packageId: 3,
                    stickerId: 180
                },
            ]
            client.pushMessage(req.body.line_id, message)
                .then(() => {
                    console.log('push message success done!')
                })
                .catch((err) => {
                    console.log(err);   // error when use fake line id 
                });

        }
        else if (state == 'failed') {
            / push message to line */
            const client = new line.Client({
                channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
            });
            const message = [
                {
                    type: 'text',
                    text: '⚠ เย็นนี้คุณแม่นับลูกดิ้นไม่ครบ 3 ครั้ง ▶ ซึ่งถือเป็นสัญญาณที่บ่งบอกว่าลูกน้อยมีภาวะสุขภาพไม่ดี '
                },
                {
                    type: 'text',
                    text: '❗ คุณแม่ควรรีบไปโรงพยาบาลโดยเร็วที่สุด เพื่อให้แพทย์ตรวจเช็คสุขภาพของลูกน้อยในครรภ์ หรือโทร 1669 ❗'
                },
                {
                    type: "sticker",
                    packageId: 2,
                    stickerId: 24
                },
            ]
            client.pushMessage(req.body.line_id, message)
                .then(() => {
                    console.log('push message go to extra done!')
                })
                .catch((err) => {
                    console.log(err);   // error when use fake line id 
                });
        }
        else if (state == 'unavailable') {
            / push message to line */
            const client = new line.Client({
                channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
            });
            const message = [
                {
                    type: 'text',
                    text: 'ยังไม่ถึงเวลาการใช้ Sadovsky หรือ เลยกำหนดเวลา \n\tมื้อเช้า 4:00-10:00 \n\tมื้อเที่ยง 11:30-14:00 \n\tมื้อเย็น 17:00-21:00'
                },
            ]
            client.pushMessage(req.body.line_id, message)
                .then(() => {
                    console.log('push message unavailable done!')
                })
                .catch((err) => {
                    console.log(err);   // error when use fake line id 
                });
        }
        else if (state == 'check_auto') {
            / push message to line */
            const client = new line.Client({
                channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
            });
            const message = [
                {
                    type: 'text',
                    text: 'ตอนนี้เลยเวลาของ Sadovsky คุณแม่ต้องเปลี่ยนไปนับแบบ Count to ten ค่ะ'
                },
            ]
            client.pushMessage(req.body.line_id, message)
                .then(() => {
                    console.log('push message check auto done!')
                })
                .catch((err) => {
                    console.log(err);   // error when use fake line id 
                });
        }
    }


    /* close daily counting every 18 hr */
    // function closeAutomatic() {
    //     setTimeout(function () {
    //         dataCollection.findOne({ line_id: req.body.line_id })
    //             .exec()
    //             .then(docs => {
    //                 var _did = docs.counting[(docs.counting.length) - 1]._did;

    //                 dataCollection.updateOne({ line_id: req.body.line_id, 'counting._did': _did }, {
    //                     $set: {
    //                         timer_status: "timeout",
    //                         sdk_status: 'enable',
    //                         extra: 'disable',
    //                         count_type: 'any',
    //                         'counting.$.status': 'close'
    //                     }
    //                 }, function (err, docs) {
    //                     console.log(err);
    //                     console.log('close automatic success');
    //                 });
    //             }).catch(err => {
    //                 console.log(err)
    //                 // res.status(200).json({
    //                 //     account: false,
    //                 //     message: 'line id not found.',
    //                 // });
    //             });
    //     }, 900000); / <----------------------------------------- pls come back to set time to 18 hr */
    // }



    function checkAvailableTime(status, time) {
        if (status == 'close') {    // 4.00-10.00
            switch (parseInt(time.slice(0, 2))) {
                case 04:
                    availableTime = true;
                    break;
                case 05:
                    availableTime = true;
                    break;
                case 06:
                    availableTime = true;
                    break;
                case 07:
                    availableTime = true;
                    break;
                case 08:
                    availableTime = true;
                    break;
                case 09:
                    availableTime = true;
                    break;
            }

            // greater than 10.00 go to ctt
            if (parseInt(time.slice(0, 2)) >= 10 && parseInt(time.slice(0, 2)) < 24) {
                gotoCtt();
            }
        }
        else if (status == '1st') {   // 11.30-14.00
            switch (parseInt(time.slice(0, 2))) {
                case 11:
                    if (parseInt(time.slice(3, 5)) >= 30 && parseInt(time.slice(3, 5)) <= 59) {
                        availableTime = true;
                    }
                    break;
                case 12:
                    availableTime = true;
                    break;
                case 13:
                    availableTime = true;
                    break;
            }

            // greater than 14.00 go to ctt
            if (parseInt(time.slice(0, 2)) >= 14 && parseInt(time.slice(0, 2)) < 24) {
                gotoCtt();
            }
        }
        else if (status == '2nd') {     // 17.00-21.00
            switch (parseInt(time.slice(0, 2))) {
                case 17:
                    availableTime = true;
                    break;
                case 18:
                    availableTime = true;
                    break;
                case 19:
                    availableTime = true;
                    break;
                case 20:
                    availableTime = true;
                    break;
            }

            // greater than 21.00 go to ctt
            if (parseInt(time.slice(0, 2)) >= 21 && parseInt(time.slice(0, 2)) < 24) {
                gotoCtt();
            }
        }

        if (availableTime == false) {
            pushMessage('unavailable');
        }
        console.log('availableTime = ' + availableTime);
    }

    function checkAvailableTimeAutomatic(status) {   // close state for check sdk
        console.log('running checkAvailableTimeAutomatic()')

        var getDate = new Date(Date.now()).getDate();
        var getMonth = new Date(Date.now()).getMonth() + 1;
        let sScheduleTimeOutLunch = '0 14 ' + getDate + ' ' + getMonth + ' *';
        let sScheduleTimeOutDinner = '0 21 ' + getDate + ' ' + getMonth + ' *';
        
        if (status == '1st') {
            cron.schedule(sScheduleTimeOutLunch, () => {  // 0 14
                console.log('corn 1st : check lunch');

                dataCollection.findOne({ line_id: req.body.line_id })
                    .exec()
                    .then(docs => {
                        var nowStatus = docs.counting[(docs.counting.length) - 1].status

                        if (nowStatus == '1st') {
                            pushMessage('check_auto');
                            gotoCtt();
                        }
                        else if (nowStatus == '2nd') {
                            console.log('corn 1st : it is ok')
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    });

            }, {
                    scheduled: true,
                    timezone: "Asia/Bangkok"
                });
        }
        else if (status == '2nd') {
            cron.schedule(sScheduleTimeOutDinner, () => {   // 0 20
                console.log('corn : check lunch');

                dataCollection.findOne({ line_id: req.body.line_id })
                    .exec()
                    .then(docs => {
                        var nowStatus = docs.counting[(docs.counting.length) - 1].status

                        if (nowStatus == '2nd') {
                            pushMessage('check_auto');
                            gotoCtt();
                        }
                        else if (nowStatus == '3st') {
                            console.log('corn 2nd : it is ok')
                        }
                    })
                    .catch(err => {
                        console.log(err);
                    });

            }, {
                    scheduled: true,
                    timezone: "Asia/Bangkok"
                });
        }
    }

    function gotoCtt() {
        dataCollection.findOne({ line_id: req.body.line_id })
            .exec()
            .then(docs => {
                var _did = docs.counting[(docs.counting.length) - 1]._did;
                dataCollection.updateOne({ line_id: req.body.line_id, 'counting._did': _did }, {
                    $set: {
                        timer_status: "timeout",
                        sdk_status: 'disable',
                        extra: 'ctt',
                        count_type: 'ctt',
                        'counting.$.status': 'close'
                    }
                }, function (err, docs) {
                    console.log(err);
                });
            }).catch(err => {
                console.log(err)
            });
    }

});

module.exports = router;

// var getDate = new Date(Date.now()).getDate();
// var getMonth = new Date(Date.now()).getMonth() + 1;
// let sScheduleLunch = '0 12 ' + getDate + ' ' + getMonth + ' *';
// let sScheduleDinner = '0 18 ' + getDate + ' ' + getMonth + ' *';

// cron.schedule(sScheduleLunch, () => {
    //     console.log('Runing a job  at Asia/Bangkok timezone');

    //     / push message to line */
    //     const client = new line.Client({
    //         channelAccessToken: 'SCtu4U76N1oEXS3Ahq1EX9nBNkrtbKGdn8so1vbUZaBIXfTlxGqMldJ3Ego3GscxKGUB7MlfR3DHtTbg6hrYPGU9reSTBcCSiChuKmDCMx4FTtIPXzivaYUi3I6Yk1u/yF5k85Le0IUFrkBNxaETxFGUYhWQfeY8sLGRXgo3xvw='
    //     });
    //     const message = [
    //         {
    //             type: 'text',
    //             text: 'เที่ยงแล้ว อย่าลืมมานับ Sadovsky ต่อนะคะ'
    //         },
    //     ]
    //     client.pushMessage(lineId, message)
    //         .then(() => {
    //             console.log('corn : push lunch message done!')
    //         })
    //         .catch((err) => {
    //             console.log(err);   // error when use fake line id 
    //         });
    // }, {
    //         scheduled: true,
    //         timezone: "Asia/Bangkok"
    //     });