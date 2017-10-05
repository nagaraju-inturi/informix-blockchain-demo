pragma solidity ^0.4.4;
contract Hotel { 

	address public organizer;
	mapping (address => uint) public registrantsPaid;
	uint public numReservations;
	uint public quota;

	event Deposit(address _from, uint _amount); // so you can log the event
	event Refund(address _to, uint _amount); // so you can log the event

	function Hotel() {
		organizer = msg.sender;		
		quota = 100;
		numReservations = 0;
	}

	function reserveHotel() payable {
		if (numReservations >= quota) { 
			revert; // revert ensures funds will be returned
		}
		registrantsPaid[msg.sender] = msg.value;
		numReservations++;
		Deposit(msg.sender, msg.value);
	}

	function changeQuota(uint newquota) public {
		if (msg.sender != organizer) { return; }
		quota = newquota;
	}

	function cancelHotel(address recipient, uint amount) public {
		if (msg.sender != organizer) { return; }
		if (registrantsPaid[recipient] == amount) { 
			address myAddress = this;
			if (myAddress.balance >= amount) { 
				if (recipient.send(amount))
                                    revert;
				Refund(recipient, amount);
				registrantsPaid[recipient] = 0;
				numReservations--;
			}
		}
		return;
	}

	function destroy() {
		if (msg.sender == organizer) { // without this funds could be locked in the contract forever!
			suicide(organizer);
		}
	}
}
