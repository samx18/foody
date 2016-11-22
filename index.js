'use strict';
var request = require('request');
var speech = require('./speech.json');
var apiNDBNO1 = "http://api.nal.usda.gov/ndb/search/?format=json&q=";
var apiNDBNO2 = "&sort=n&max=1&offset=0&api_key=";
var apiNut1 = "http://api.nal.usda.gov/ndb/reports/?ndbno=";
var apiNut2 =  "&type=b&format=json&api_key=";
var apiKey = "DseYd8GMNU9iqlrfBk2OJE6i7N1EhAB36xeqZ0ZN";


// --------------- Helpers that build all of the responses -----------------------

function buildSpeechletResponse(title, output, repromptText, shouldEndSession,cardOutput) {
    return {
        outputSpeech: {
            type: 'PlainText',
            text: output,
        },
        card: {
            type: 'Simple',
            title: `SessionSpeechlet - ${title}`,
            content: cardOutput,
        },
        reprompt: {
            outputSpeech: {
                type: 'PlainText',
                text: repromptText,
            },
        },
        shouldEndSession,
    };
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: '1.0',
        sessionAttributes,
        response: speechletResponse,
    };
}


// --------------- Functions that control the skill's behavior -----------------------

function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    const sessionAttributes = {};
    const cardTitle = 'Welcome';
    const speechOutput = speech.greet;
    const cardOutput = speech.greet;  
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    const repromptText = speech.reprompt;
    const shouldEndSession = false;

    callback(sessionAttributes,
        buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession,cardOutput));
}



function handleSessionEndRequest(callback) {
    const cardTitle = 'Session Ended';
    const speechOutput = speech.bye;
    const cardOutput = speech.bye;
    const shouldEndSession = true;
    callback({}, buildSpeechletResponse(cardTitle, speechOutput, null, shouldEndSession,cardOutput));
}


function getWorkoutDetails(intent, session, callback) {
    const cardTitle = intent.name;
    const foodName = intent.slots.Food.value;
    var bodyWeight;
    let repromptText = '';
    let sessionAttributes = {};
    const shouldEndSession = false;
    let speechOutput = '';
    let cardOutput = '';
    const walkMin = 0.27;
    const runMin = 0.10;
    const bikeMin = 0.14;
    console.log(foodName)
    getNutritionInformation(foodName,function(calories,protein,fat,sugar,fiber){
        if (calories === null){
            speechOutput = speech.notfound;
            cardOutput = speech.notfound;
            callback(sessionAttributes,
                 buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession,cardOutput));
        }else{
            calories = parseInt(calories);
            protein = parseInt(protein);
            fat = parseInt(fat);
            sugar = parseInt(sugar);
            fiber = parseInt(fiber);
            cardOutput = getAdditionalNutrition(protein,fat,sugar,fiber);
            console.log(cardOutput); // debug
            console.log("Protein: " + protein + " Fat: " + fat+" Sugar: "+sugar+" Fiber: "+fiber); // debug
            var walkTime = Math.trunc(calories*walkMin);
            var runTime = Math.trunc(calories*runMin);
            var bikeTime = Math.trunc(calories*bikeMin);
            console.log('walkTime: '+walkTime);
            speechOutput = `There are approximatey ${calories} calories in a serving of ${foodName}.`+ 
            `To burn that, You need to walk ${walkTime} minutes, bike ${bikeTime} minutes or run ${runTime} minutes`;
            callback(sessionAttributes,
                 buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession,cardOutput));
        }
    });
}

function getNDBNO(foodName,callback) {
    request.get(apiNDBNO1+foodName+apiNDBNO2+apiKey, function(err,res,body){
    if (!err && res.statusCode == 200) {
      var info = JSON.parse(body);
      try{
        var foodID = info.list.item[0].ndbno;
        console.log(foodID); // debug info
        callback(foodID);
        return;
      }catch(err){
        callback(null);
      }
    }else {
      callback(null);
      return;
    }
  });
}

function parseNutrition(info,nid){
    var nutArray = info.report.food.nutrients.filter(function(nut){return nut.nutrient_id === nid });
    return nutArray[0].value;
}

function getAdditionalNutrition(protein,fat,sugar,fiber){
    if (sugar > 15){
        console.log("High sugar food");
        return speech.sugar;
    }else if (fat > 30) {
        console.log("High fat food");
        return speech.fat;
    } else if (protein > 8) {
        console.log("High protein food");
        return speech.protein;
    } else if (fiber > 5){
        console.log("High fiber food");
        return speech.fiber;
    }

}

function getNutritionInformation(foodName,callback){
  getNDBNO(foodName,function(foodID){
    request.get(apiNut1+foodID+apiNut2+apiKey, function(err,res,body){
      if (!err && res.statusCode == 200) {
        var info = JSON.parse(body);
        try{
          var calories = parseNutrition(info,'208');
          var protein = parseNutrition(info,'203');
          var fat = parseNutrition(info,'204');
          var sugar = parseNutrition(info,'269');
          var fiber = parseNutrition(info,'291');
          callback(calories,protein,fat,sugar,fiber);
          return;
        } catch(err){
          callback(null);
        }
    }else{
      callback(null);
      return;
    }
    });
  });
}

// --------------- Events -----------------------

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log(`onSessionStarted requestId=${sessionStartedRequest.requestId}, sessionId=${session.sessionId}`);
}

/**
 * Called when the user launches the skill without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log(`onLaunch requestId=${launchRequest.requestId}, sessionId=${session.sessionId}`);

    // Dispatch to your skill's launch.
    getWelcomeResponse(callback);
}

/**
 * Called when the user specifies an intent for this skill.
 */
function onIntent(intentRequest, session, callback) {
    console.log(`onIntent requestId=${intentRequest.requestId}, sessionId=${session.sessionId}`);

    const intent = intentRequest.intent;
    const intentName = intentRequest.intent.name;

    // Dispatch to your skill's intent handlers
    if (intentName === 'GetWorkoutIntent') {
        getWorkoutDetails(intent, session, callback);
        //setColorInSession(intent, session, callback);
    } else if (intentName === 'AMAZON.HelpIntent') {
        getWelcomeResponse(callback);
    } else if (intentName === 'AMAZON.StopIntent' || intentName === 'AMAZON.CancelIntent') {
        handleSessionEndRequest(callback);
    } else {
        throw new Error('Invalid intent');
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the skill returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log(`onSessionEnded requestId=${sessionEndedRequest.requestId}, sessionId=${session.sessionId}`);
    // Add cleanup logic here
}


// --------------- Main handler -----------------------

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = (event, context, callback) => {
    try {
        console.log(`event.session.application.applicationId=${event.session.application.applicationId}`);

        /**
         * Uncomment this if statement and populate with your skill's application ID to
         * prevent someone else from configuring a skill that sends requests to this function.
         */
        /*
        if (event.session.application.applicationId !== 'amzn1.echo-sdk-ams.app.[unique-value-here]') {
             callback('Invalid Application ID');
        }
        */

        if (event.session.new) {
            onSessionStarted({ requestId: event.request.requestId }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'IntentRequest') {
            onIntent(event.request,
                event.session,
                (sessionAttributes, speechletResponse) => {
                    callback(null, buildResponse(sessionAttributes, speechletResponse));
                });
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            callback();
        }
    } catch (err) {
        callback(err);
    }
};
