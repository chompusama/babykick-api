/**
 *  @POST
 *  for sadovsky
 *  check current week/day
 * 
 *  Created by CPU on 10/9/19
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const line = require('@line/bot-sdk');
const cron = require('node-cron');

const dataCollection = require("../models/dataModel");

router.post("/:lineId", (req, res, next) => {

    lineId = req.params.lineId;

    // check current week and day 
    dataCollection.findOne({ line_id: lineId })
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

                var _did = (week.toString() + 'w' + day.toString() + 'd').toString();


                if (docs.timer_status == 'running') {

                    res.json(docs.counting[(docs.counting.length) - 1]);

                    if (docs.counting[countingLength - 1].status == '1st') {
                        if (docs.counting[countingLength - 1].sdk_first_meal == 9) {
                            successfully(_did, '1st');
                        }
                        else {
                            onFirstMeal(_did);
                        }
                    }
                    else if (docs.counting[countingLength - 1].status == '2nd') {
                        if (docs.counting[countingLength - 1].sdk_second_meal == 9) {
                            successfully(_did, '2nd');
                        }
                        else {
                            onSecondMeal(_did);
                        }
                    }
                    else if (docs.counting[countingLength - 1].status == '3rd') {

                        if (docs.counting[countingLength - 1].sdk_third_meal == 2) {
                            successfully(_did, '3rd');
                        }
                        else if (docs.counting[countingLength - 1].sdk_all_meal >= 9) {
                            successfully(_did, '3rd');
                        }

                        else if (docs.counting[countingLength - 1].sdk_all_meal < 9) {
                            onThirdMeal(_did);
                        }
                    }
                    else if (docs.counting[countingLength - 1].status == 'extra') {

                        if (docs.counting[countingLength - 1].sdk_extra_meal >= 9) {
                            successfully(_did, 'extra');
                        }

                        else if (docs.counting[countingLength - 1].sdk_extra_meal < 9) {
                            onExtraMeal(_did);
                        }
                    }
                }
                else {
                    console.log(req.params.lineId + ' sdkIncreasing : now status is time out')
                    res.json({ timer_status: 'timeout' })
                }
            }
        }).catch(err => {
            console.log(err)
            res.json({
                message: 'line id not found.',
            });
        });



    function onFirstMeal(_did) {
        dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
            {
                $inc: {
                    'counting.$.sdk_first_meal': 1,
                    'counting.$.sdk_all_meal': 1
                },
                $set: {
                    timer_status: 'running'
                }
            },
            {
                modifiedCount: 1
            },
            function (err, docs, res) {
                console.log(err);
                console.log(req.params.lineId + ' sdkIncreasing : increase sdk_first_meal successful!')
            }
        );
    }

    function onSecondMeal(_did) {
        dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
            {
                $inc: {
                    'counting.$.sdk_second_meal': 1,
                    'counting.$.sdk_all_meal': 1
                },
                $set: {
                    timer_status: 'running'
                }
            },
            {
                modifiedCount: 1
            },
            function (err, docs, res) {
                console.log(err);
                console.log(req.params.lineId + ' sdkIncreasing : increase sdk_second_meal successful!');
            }
        );

    }

    function onThirdMeal(_did) {
        dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
            {
                $inc: {
                    'counting.$.sdk_third_meal': 1,
                    'counting.$.sdk_all_meal': 1
                },
                $set: {
                    timer_status: 'running'
                }
            },
            {
                modifiedCount: 1
            },
            function (err, docs, res) {
                console.log(err);
                console.log(req.params.lineId + ' sdkIncreasing : increase sdk_third_meal successful!');
            }
        );
    }

    function onExtraMeal(_did) {
        dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
            {
                $inc: {
                    'counting.$.sdk_extra_meal': 1,
                    'counting.$.sdk_all_meal': 1
                },
                $set: {
                    timer_status: 'running'
                }
            },
            {
                modifiedCount: 1
            },
            function (err, docs, res) {
                console.log(err);
                console.log(req.params.lineId + ' sdkIncreasing : increase sdk_extra_meal successful!');
            }
        );
    }

    function successfully(_did, meal) {
        if (meal == '1st') {
            dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
                {
                    $inc: {
                        'counting.$.sdk_first_meal': 1,
                        'counting.$.sdk_all_meal': 1
                    },
                    $set: {
                        'counting.$.status': 'close',
                        'counting.$.result': 'ลูกดิ้นดี',
                        timer_status: 'timeout',
                        sdk_status: 'enable',
                        extra: 'disable',
                        count_type: 'any',
                    }
                },
                {
                    modifiedCount: 1
                },
                function (err, docs, res) {
                    console.log(err);
                    console.log(req.params.lineId + ' sdkIncreasing : sdk successful!');
                }
            );
        }
        else if (meal == '2nd') {
            dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
                {
                    $inc: {
                        'counting.$.sdk_second_meal': 1,
                        'counting.$.sdk_all_meal': 1
                    },
                    $set: {
                        'counting.$.status': 'close',
                        'counting.$.result': 'ลูกดิ้นดี',
                        timer_status: 'timeout',
                        sdk_status: 'enable',
                        extra: 'disable',
                        count_type: 'any',
                    }
                },
                {
                    modifiedCount: 1
                },
                function (err, docs, res) {
                    console.log(err);
                    console.log(req.params.lineId + ' sdkIncreasing : sdk successful!');
                }
            );
        }
        else if (meal == '3rd') {
            dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
                {
                    $inc: {
                        'counting.$.sdk_third_meal': 1,
                        'counting.$.sdk_all_meal': 1
                    },
                    $set: {
                        'counting.$.status': 'close',
                        'counting.$.result': 'ลูกดิ้นดี',
                        timer_status: 'timeout',
                        sdk_status: 'enable',
                        extra: 'disable',
                        count_type: 'any',
                    }
                },
                {
                    modifiedCount: 1
                },
                function (err, docs, res) {
                    console.log(err);
                    console.log(req.params.lineId + ' sdkIncreasing : sdk successful!');
                }
            );
        }
        else if (meal == 'extra') {
            dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
                {
                    $inc: {
                        'counting.$.sdk_extra_meal': 1,
                        'counting.$.sdk_all_meal': 1
                    },
                    $set: {
                        'counting.$.status': 'close',
                        'counting.$.result': 'ลูกดิ้นดี',
                        timer_status: 'timeout',
                        sdk_status: 'enable',
                        extra: 'disable',
                        count_type: 'any',
                    }
                },
                {
                    modifiedCount: 1
                },
                function (err, docs, res) {
                    console.log(err);
                    console.log(req.params.lineId + ' sdkIncreasing : sdk successful!');
                }
            );
        }

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
                text: 'วันนี้คุณแม่นับลูกดิ้นเรียบร้อยแล้ว กลับมานับใหม่พรุ่งนี้นะคะ'
            },
            // {
            //     type: "sticker",
            //     packageId: 3,
            //     stickerId: 180
            // }
        ]
        client.pushMessage(lineId, message)
            .then(() => {
                console.log(req.params.lineId + ' sdkIncreasing : push message <successful> done!')
            })
            .catch((err) => {
                console.log(err);   // error when use fake line id 
            });
    }

});


/  ====================================== *extra* ======================================= /

router.post("/extra/:lineId", (req, res, next) => {

    lineId = req.params.lineId;

    // check current week and day 
    dataCollection.findOne({ line_id: lineId })
        .exec()
        .then(docs => {

            if (docs == null || docs == "") {
                res.json({
                    status: 'error',
                    message: 'line id is invalid',
                });
            }
            else {
                if (docs.timer_status == 'running') {

                    res.json(docs.counting[(docs.counting.length) - 1]);

                    var week = Math.ceil((docs.counting.length) / 7);
                    var day = (docs.counting.length) % 7;
                    var _did = (week.toString() + 'w' + day.toString() + 'd').toString();

                    if (docs.counting[(docs.counting.length) - 1].status == '3rd') {
                        if (docs.counting[(docs.counting.length) - 1].sdk_all_meal >= 9) {
                            onThirdMeal('timeout', _did);
                        }
                        else {
                            onThirdMeal('running', _did);
                        }
                    }
                }
                else {
                    console.log(req.params.lineId + ' sdkIncreasing extra : now status is time out')
                    res.json({ timer_status: 'timeout' })
                }
            }
        }).catch(err => {
            console.log(err)
            res.json({
                message: 'line id not found.',
            });
        });

    function onThirdMeal(timerStatus, _did) {
        if (timerStatus == 'running') {
            dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
                {
                    $inc: {
                        'counting.$.sdk_third_meal': 1,
                        'counting.$.sdk_all_meal': 1
                    },
                    $set: {
                        timer_status: timerStatus,
                    }
                },
                {
                    modifiedCount: 1
                },
                function (err, docs, res) {
                    console.log(err);
                    console.log(req.params.lineId + ' sdkIncreasing extra : increase sdk_third_meal successful!');
                }
            );
        }
        else {
            dataCollection.findOneAndUpdate({ line_id: lineId, 'counting._did': _did },
                {
                    $inc: {
                        'counting.$.sdk_third_meal': 1,
                        'counting.$.sdk_all_meal': 1
                    },
                    $set: {
                        'counting.$.status': 'close',
                        'counting.$.result': 'ลูกดิ้นดี',
                        timer_status: timerStatus,
                        sdk_status: 'enable',
                        extra: 'disable',
                        count_type: 'any',
                    }
                },
                {
                    modifiedCount: 1
                },
                function (err, docs, res) {
                    console.log(err);
                    console.log(req.params.lineId + ' sdkIncreasing extra : increase sdk_third_meal successful!');
                }
            );

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
                // {
                //     type: "sticker",
                //     packageId: 3,
                //     stickerId: 180
                // }
            ]
            client.pushMessage(lineId, message)
                .then(() => {
                    console.log(req.params.lineId + ' sdkIncreasing extra : push message <success> done!')
                })
                .catch((err) => {
                    console.log(err);   // error when use fake line id 
                });
        }
    }

});
module.exports = router;