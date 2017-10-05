var Hotel = artifacts.require("Hotel");
contract('Hotel', function(accounts) {
  //console.log(accounts);
  var owner_account = accounts[0];
  var sender_account = accounts[1];
  var last_transactionHash = 0;
  global.contract_address = null;
  // IMPORTANT NOTE: Point jdbcjarfile to location of Informix JDBC JAR file
  global.jdbcjarfile = "/opt/ibm/data/informix-blockchain-demo/ifxjdbc.jar"
  // IMPORTANT NOTE: Change Informix connection credentials
  global.jdbcurl = "jdbc:informix-sqli://172.20.0.10:60000/sysadmin:USER=informix;PASSWORD=changeme";
  global.java = require("java");
  global.java.asyncOptions = { syncSuffix: "" };
  global.java.classpath.push(global.jdbcjarfile);

  it("==>Check and create Hotel Reservation smart-contract!", function(done) {

    if (global.contract_address == null) {
  	Hotel.new({ from: accounts[0] }).then(
  		function(hotel) {
                global.contract_address = hotel.address;
                console.log("    Created Hotel Reservation SmartContract.");
                console.log("    Register Informix smart trigger on conference registration table and wait for event data");
                done();
  	}).catch(done);
    }
    else {
         console.log("    Hotel Reservation smart-contract already deployed at address: ", global.contract_address);
         done();
    }
  });

  it("==>Wait and reserve hotel for conference attendee!", function(done) {

    var hotel = Hotel.at(global.contract_address);
    var roomPrice = web3.toWei(.05, 'ether');
    var initialBalance = web3.eth.getBalance(hotel.address).toNumber();  

    var smartTrigger = global.java.newInstanceSync("com.informix.smartTrigger.IfxSmartTrigger", global.jdbcurl);
    smartTrigger.timeout(60);
    smartTrigger.open();
    smartTrigger.addTrigger("registration", "informix", "conference", "SELECT * FROM registration", "smart-trigger");
    smartTrigger.registerTriggers();
    var jsonstr = smartTrigger.readTriggerEvent();
    console.log();
    console.log('Event Document:', jsonstr);
    console.log();
    var jsonobj = JSON.parse(jsonstr);
    if (jsonobj['operation'] == "insert")
        {
        console.log("    Add customer account ", jsonobj.rowdata.address, " to Hotel Reservation Smart Contract account");
 	hotel.reserveHotel({ from: jsonobj.rowdata.address, value: roomPrice }).then(
          function() {
  		var newBalance = web3.eth.getBalance(hotel.address).toNumber();
                var difference = newBalance - initialBalance;
  		assert.equal(difference, roomPrice, "Difference should be what was sent");
  		return hotel.numReservations.call(); 
  		}).then(
	  function(num) { 
  			assert.isAbove(num, 0, "there should be atleast 1 registrant");
  			return hotel.registrantsPaid.call(sender_account);
  		}).then(
 	  function(amount) {
  			assert.equal(amount.toNumber(), roomPrice, "Sender's paid but is not listed as paying");	
  			return web3.eth.getBalance(hotel.address);
  		}).then(
  	  function(bal) {
                        assert.isAtLeast(bal.toNumber(), roomPrice, "Final balance mismatch");
  					done();
 		}).catch(done);
        }
  });

});

