var fs = require('fs')
  , binaryCSV = require('binary-csv');

module.exports = function (date, xPath, tracePath, callback){
  var hasCallbacked = false;
  var states = {}; //key are the indexes

  var xStream = fs.createReadStream(xPath).pipe(binaryCSV({json: true}));
  xStream.on('data', function(x){
    if(x.date === date){
      states[x.index] = x;
    }   
  });
  xStream.on('error', function(err){
    hasCallbacked = true;
    return callback(err);
  });
  xStream.on('end', function(x){

    var indexes = Object.keys(states);
    if(!indexes.length && !hasCallbacked){
      return callback(new Error('states could not be found for date: ' + date));
    }

    var thetas = {}; 

    var traceStream = fs.createReadStream(tracePath).pipe(binaryCSV({json: true}));
    traceStream.on('data', function(x){
      if(indexes.indexOf(x.index) !== -1){
        thetas[x.index] = x;
      }    
    });
    traceStream.on('error', function(err){
      hasCallbacked = true;
      return callback(err);
    });
    traceStream.on('end', function(x){
      var n_thetas = Object.keys(thetas).length;
      if( (!n_thetas || (n_thetas !== indexes.length)) && !hasCallbacked){
        return callback(new Error('traces row could not be found for date: ' + date));
      }

      var data = [];
      indexes.forEach(function(index){
        var myState = {}, myTheta = {};

        //coerce
        var state = states[index];
        for(var s in state){
          if( (s !== 'date') && (s !== 'index')){
            myState[s] = parseFloat(state[s]);
          }
        }

        var theta = thetas[index]
        for(var p in theta){
          if( (p !== 'fitness') && (p !== 'index')){
            myTheta[p] = parseFloat(theta[p]);
          }
        }

        data.push({ resources: [
          { name: "values", data: myTheta },
          { name: "states", data: myState }
        ] });
        
      });
      
      callback(null, data);

    });       

  });
  
};
