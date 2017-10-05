var Conference = artifacts.require("Conference");
contract('Conference', function(accounts) {
  var owner_account = accounts[0];
  var sender_account = accounts[1];
  var last_transactionHash = 0;
  global.contract_address = null;
  global.ConStr = "SERVER=myserv;DATABASE=conference;HOST=172.20.0.10;SERVICE=60000;PROTOCOL=onsoctcp;UID=informix;PWD=changeme;";
  global.dbobj = require('ifxnjs');


  it("==>Get Conference contract address from Informix!", function(done) {
    getContractFromInformix(owner_account, done);
  });

  it("==>Check and create conference contract!", function(done) {

    if (global.contract_address == null) {
  	Conference.new({ from: accounts[0] }).then(
  		function(conference) {
                global.contract_address = conference.address;
                registerContractWithInformix(owner_account, global.contract_address, done);
  	}).catch(done);
    }
    else {
         console.log("Conference contract already deployed at address: ", global.contract_address);
         done();
    }
  });

  it("==>Buy ticket to conference!", function(done) {

  	var conference = Conference.at(global.contract_address);
        // Register callback with smart contract blockchain account on 'Deposit' event
        conference.Deposit().watch(function(error, result){
                var transactionIndex = result.transactionHash;
                if (transactionIndex == last_transactionHash)
                    return; // event already fired for this transaction.
                last_transactionHash = transactionIndex;
                console.log("BlockChain callback: New smart contract registration event received! ", JSON.stringify(result.args));
        	//console.log(JSON.stringify(result.args));
                notifyInformix(result.args._from, done)
                done();

        });
/*
        var event = conference.allEvents().watch({}, '');
        event.watch(function (error, result) {
          if (error) {
              console.log("Error: " + error);
              } else {
              console.log("Event: " + result.event);
              }
          });

*/
        var ticketPrice = web3.toWei(.05, 'ether');
        var initialBalance = web3.eth.getBalance(conference.address).toNumber();  

 	conference.buyTicket({ from: accounts[1], value: ticketPrice }).then(
          function() {
  		var newBalance = web3.eth.getBalance(conference.address).toNumber();
                var difference = newBalance - initialBalance;
  		assert.equal(difference, ticketPrice, "Difference should be what was sent");
  		return conference.numRegistrants.call(); 
  		}).then(
	  function(num) { 
  			assert.isAbove(num, 0, "there should be atleast 1 registrant");
  			return conference.registrantsPaid.call(sender_account);
  		}).then(
 	  function(amount) {
  			assert.equal(amount.toNumber(), ticketPrice, "Sender's paid but is not listed as paying");	
  			return web3.eth.getBalance(conference.address);
  		}).then(
  	  function(bal) {
                        assert.isAtLeast(bal.toNumber(), ticketPrice, "Final balance mismatch");
  					//done();
 		}).catch(done);
  });

});


// Connect to Informix server
function connect2Informix() {

    try
     {
       global.conn = global.dbobj.openSync(global.ConStr);
     }
     catch(e)
     {
       console.log(e);
       return;
     }
}

// Execute SQL statement.
function execSql(sql) {
    try
      {
      var result = global.conn.querySync( sql );
      // console.log( sql  );
      console.log( 'Informix: Added new registration record to Informix DB!!');
      process.exit(0);
      }
    catch (e) 
      {
      console.log( "--- " + sql  );
      console.log(e);
      console.log();
      process.exit(1);
      }
}

// Close Informix connection.
function closeInformixCon() {
    try 
      {
      conn.closeSync();
      process.exit(0);
      }
    catch(e) 
      {
      console.log(e);
      process.exit(1);
      }
}


function notifyInformix(buyer, done) {

    if (global.conn == null)
        connect2Informix();
    if (global.conn == null)
        return;

    var sql = 'insert into registration( address ) values("' + buyer + '");';
    execSql(sql);
    closeInformixCon();
    process.exit(0);
}

function registerContractWithInformix(owner, contract_addr, done) {

    if (global.conn == null)
        connect2Informix();
    if (global.conn == null)
        return;
    var sql = 'insert into contract_addr( owner, conaddr ) values("' + owner + '","' + contract_addr + '");';
    execSql(sql);
    console.log( 'Informix: Registered new contract address with Informix!! addr:', contract_addr );
    done();
}

function getContractFromInformix(owner, done) {

    if (global.conn == null)
        connect2Informix();
    if (global.conn == null)
        return;


   var sql = 'select first 1 conaddr from contract_addr where owner = "' + owner + '";'
try 
  {
   var results = global.conn.querySync( sql );
        if (results[0] != undefined) {
        global.contract_address = results[0].conaddr.trim();
        //console.log( 'getContractFromInformix() contract_address:', global.contract_address );
        done();
        }
  } 
  catch (e)
  {
    console.log( "--- " + sql  );
    console.log(e);
    console.log();
    process.exit(1);
  }

}
