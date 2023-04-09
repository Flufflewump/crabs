//@ts-check

var msgLog;
var resourceList;
var tabList;
var paneList;
var statusMsg;

/*
 * 
 * OBJECT DEFINITIONS
 * 
 */

var game = {
		tabs: new Map(), resources: new Map(), milestones: new Map(), globals: new Map(), debug: false, activeTab: null
	};

function GameTab(name, text, buttons) {
	this.name = name;
	this.text = text;
	this.buttons = buttons;
	this.visible = false;
	this.tabNode = null;
	this.textNode = null;
	this.paneNode = null;
}

GameTab.prototype.toString = function () {
	return this.name;
}

function Resource(name) {
	this.name = name;
	this.amount = 0;
	this.displayNode = null;
	this.amountNode = null;
	this.visible = false;
}

Resource.prototype.toString = function () {
	return this.name;
}

function Button(text, func, enableTest = function () { return true; }, price = '') {
	this.text = text;
	this.price = price;
	this.func = func;
	this.node = null;
	this.visible = false;
	this.enableTest = enableTest;
}

function Milestone(name, test, event, checkOnLoad = false) {
	this.name = name;
	this.test = test;
	this.event = event;
	this.active = false;
	this.checkOnLoad = checkOnLoad;
}


// May not really be a building, I just needed a name for "thing that ticks every tick"
function Building(name, update, modifiers) {
	this.name = name;
	this.update = update;
	this.modifiers = modifiers;
}

// Price gets its own object because they've got behaviour in common. Maybe I'm just too into JS's OOP bullshit.

function Price(initial, increaseFunc) {
	this.initial = initial;
	this.iterations = 0;
	this.increaseFunc = increaseFunc;
	this.displayNode = null;

	this.get = function() {
		var tempPrice = initial;
		for (var i = 0; i < this.iterations; i++) {
			tempPrice = increaseFunc(tempPrice);
		}

		return tempPrice;
	};

	this.increment = function(times = 1) {
		this.iterations += times;
		this.displayNode.innerText = this.get();
	};

	this.setIterations = function(value) {
		this.iterations = value;
		this.displayNode.innerText = this.get();
	}
}

/*******************************************
 *                                         *
 *                GAME DATA                *
 * 		all of the "stuff" goes here       *
 *                                         *
 *******************************************/

// Create all the resources
game.resources.set('sand', new Resource('Sand'));
game.resources.set('rocks', new Resource('Rocks'));
game.resources.set('wet', new Resource('Wet'));
game.resources.set('sandcastles', new Resource('Sandcastles'));

// And the tabs
game.tabs.set('beach', new GameTab('Beach', 'Sand and rocks line the beach', new Map([
	['sand', new Button('Gather sand', 'gatherButton()')],
	['cheat', new Button('Cheat!', 'cheat()')],
	['sandcastle', new Button('Make sandcastle', 'makeSandcastle()', function () { 
		return (game.resources.get('sand').amount >= 10) },
		'10 Sand')]
])));
game.tabs.set('ocean', new GameTab('Ocean', 'The ocean is blue', new Map([
	['wet', new Button('Gather wet', 'gatherWet()')]
])));
game.tabs.set('crabitalist', new GameTab('Crabitalist', 'The crabitalist wishes to buy and sell your goods', new Map([
	['buyBucket', new Button('Buy a bucket', 'buyBucket()', function() {return (!game.globals.get('bucket') && game.resources.get('sandcastles').amount >= 20)}, '20 Sandcastles')]
])));

// Milestones
game.milestones.set('sandCastleUnlock', new Milestone('sandCastleUnlock',
	function () { return (game.resources.get('sand').amount >= 10); },
	function () {
		log('You have a little pile of sand. You could make a sandcastle out of it');
		game.tabs.get('beach').buttons.get('sandcastle').visible = true;
		this.active = false;
	}, false)
);

game.milestones.set('tooMuchWet', new Milestone('tooMuchWet',
	function () { return (game.resources.get('wet').amount >= 99); },
	function () {
		log('Ocean ran out');
		game.tabs.get('ocean').buttons.get('wet').visible = false;
		game.globals.set('oceanDrained', true);
		this.active = false;
	}, false)
);

game.milestones.set('oceanDrained', new Milestone('oceanDrained',
	function () { return (game.globals.get('oceanDrained')); },
	function () {
		game.tabs.get('ocean').textNode.textContent = "The ocean is blue and dry";
		this.active = false;
	}, true)
);

game.milestones.set('oceanBack', new Milestone('oceanBack',
	function () { return (!game.globals.get('oceanDrained')); },
	function () {
		game.tabs.get('ocean').textNode.textContent = "The ocean is blue";
		this.active = false;
	}, true)
);

game.milestones.set('unlockCrabitalist', new Milestone('unlockCrabitalist',
	function () { return (game.resources.get('sandcastles').amount >= 10); },
	function () {
		log('Your sandcastles have attracted the attention of a crabitalist');
		game.tabs.get('crabitalist').visible = true;
		game.tabs.get('crabitalist').buttons.get('buyBucket').visible = true;
		this.active = false;
	})
);

game.milestones.set('hideCrabitalist', new Milestone('hideCrabitalist',
	function () { return (game.globals.get('bucket')); },
	function () {
		log('The crabitalist has fled!');
		game.tabs.get('crabitalist').visible = false;
		switchTab('beach');
		this.active = false;
	})
);

// Globals
game.globals.set('oceanDrained', false);
game.globals.set('bucket', false);



/*
 *
 *	       CONTENT LOADED
 * 
 */

document.addEventListener('DOMContentLoaded', function () {
	msgLog = document.getElementById('log');
	resourceList = document.getElementById('resources');
	tabList = document.getElementById('tabs');
	statusMsg = document.getElementById('status');

	// @ts-ignore
	statusMsg.innerText = "You are a crab.";

	for (const [key, value] of game.resources) {
		createResourceDisplay(key);
	}

	for (const [key, value] of  game.tabs) {
		createTabDisplay(key);
    }

	setInterval(update, 100);

	loadGame();
	saveGame();

	log('Loaded game!');
	log('Debug mode is ' + (game.debug ? 'enabled' : 'disabled'), true);
});




/**********************************
 *                                *
 *	          GAME LOOP           *
 *                                *
 **********************************/

function update() {

	checkMilestones();
	updateUI();
}

function updateUI() {
	// Show visible resources
	for (const [resourceKey, resourceValue] of game.resources) {
		if (resourceValue.visible) {
			resourceValue.displayNode.classList.remove('locked');
			// Update displayed amount
			resourceValue.amountNode.innerText = resourceValue.amount;
        } else {
			resourceValue.displayNode.classList.add('locked');
		}
    }

	// Tabs
	for (const [tabKey, tabValue] of game.tabs) {
		if (tabValue.visible) {
			tabValue.tabNode.classList.remove('locked');
			tabValue.paneNode.classList.remove('locked');
        } else {
			tabValue.tabNode.classList.add('locked');
			tabValue.paneNode.classList.add('locked');
		}
		// Buttons
		for (const [buttonKey, buttonValue] of tabValue.buttons) {
			if (buttonValue.visible) {
				buttonValue.node.classList.remove('locked');
				if (buttonValue.enableTest()) {
					buttonValue.node.classList.remove('disabled');
				} else {
					buttonValue.node.classList.add('disabled');
				}
			} else {
				buttonValue.node.classList.add('locked');
			}
		}
    }	
}

function checkMilestones() {
	for (var [milestoneName, value] of game.milestones) {
		var milestone = game.milestones.get(milestoneName);
		if (milestone.active && milestone.test()) {
			milestone.event();
			saveGame();
        }
    }
}

/********************************************
 *                                          *
 *                                          *
 *             BUTTON FUNCTIONS             *
 *                                          *
 *                                          *
 *******************************************/

function cheat() {
	addResource('sand', 1000);
}

function gatherButton() {
	addResource('sand', 1);
	if (Math.random() < (1/244)) {
		addResource('rocks', 1);
		log('You found a cool rock in the sand')
	}
}

function makeSandcastle() {
	if (game.resources.get('sand').amount >= 10) {
		addResource('sand', -10);
		addResource('sandcastles', 1);
	}
}

function gatherWet() {
	addResource('wet', 1);
}

function buyBucket() {
	if (game.resources.get('sandcastles').amount >= 20) {
		addResource('sandcastles', -20);
		log('You have acquired a bucket');
		game.tabs.get('crabitalist').buttons.get('buyBucket').visible = false;
		game.globals.set('bucket', true);
	}
	saveGame();
}

/*
 * 
 * HELPER FUNCTIONS: RESOURCES
 * 
 */

function addResource(resName, amount) {
	var res = game.resources.get(resName);
	if (!res.visible) {
		unlockResource(resName);
	}
	res.amount += amount;

	checkMilestones();
	updateUI();
	saveGame();
}

function createResourceDisplay(resName) {
	var res = game.resources.get(resName);

	var newResource = document.createElement('li');
	newResource.classList.add('resource');
	newResource.classList.add('locked');
	newResource.setAttribute('id', resName);

	// This is where the amount of the resource will be displayed
	var newAmountNode = document.createElement('span');
	newAmountNode.classList.add('resource-number');
	newAmountNode.innerText = res.amount;

	// Keep it in game.resources so it can be updated
	res.displayNode = newResource;
	res.amountNode = newAmountNode;

	//Put it all together
	newResource.innerText = res.name + ': ';
	newResource.appendChild(newAmountNode);

	resourceList.appendChild(newResource);
}

function unlockResource(resName) {
	var res = game.resources.get(resName);
	res.visible = true;

	saveGame();
}

/*
 * 
 * HELPER FUNCTIONS: TABS
 * 
 */

function switchTab(tabName) {
	game.activeTab = tabName;

	var tab = game.tabs.get(tabName);


	for (var [curTab, value] of game.tabs) {
		game.tabs.get(curTab).tabNode.classList.remove('active');
		game.tabs.get(curTab).paneNode.classList.remove('active');
	}
	tab.tabNode.classList.add('active');
	tab.paneNode.classList.add('active');

	saveGame();
}

function createTabDisplay(tabName) {
	var tab = game.tabs.get(tabName);

	// Tab at top of pane
	var newTab = document.createElement('span');
	newTab.classList.add('tab');
	newTab.classList.add('locked');
	newTab.setAttribute('onclick', 'switchTab(\'' + tabName + '\')');
	newTab.setAttribute('id', tabName);
	newTab.innerText = tab.name;

	// The pane itself
	var newTabPane = document.createElement('div');
	newTabPane.classList.add('pane');
	newTabPane.classList.add('locked');
	newTabPane.setAttribute('id', tabName);

	// Text description
	var tabText = document.createElement('div');
	tabText.classList.add('tab-text');
	tabText.innerText = tab.text;
	newTabPane.appendChild(tabText);

	tab.textNode = tabText;

	// Add buttons
	var buttonDiv = document.createElement('div');
	buttonDiv.classList.add('button-list');
	newTabPane.appendChild(buttonDiv);

	for (var [buttonName, value] of tab.buttons) {
		var button = tab.buttons.get(buttonName);

		var newButton = document.createElement('button');
		newButton.classList.add('locked');
		newButton.setAttribute('onclick', button.func);
		newButton.innerText = (button.text);

		if (button.price != '') {
			var priceDisplay = document.createElement('div');
			priceDisplay.classList.add('button-price');
			priceDisplay.textContent = button.price;
			newButton.appendChild(priceDisplay);
		}

		button.node = newButton;

		buttonDiv.appendChild(newButton);
    }

	tab.tabNode = newTab;
	tab.paneNode = newTabPane;

	// Add them to the DOM
	tabList.appendChild(newTab);
	// @ts-ignore
	document.getElementById('panes').appendChild(newTabPane);

}

function unlockTab(name) {
	var tab = game.tabs.get(name);

	tab.visible = true;	
}

/*
 * 
 * LOGGING
 * 
 */

function log(msg, debug = false) {
	if (debug) {
		console.log(msg);
		if (!game.debug) { return };
	}
	const newMsg = document.createElement('li');
	newMsg.classList.add('logmsg');
	newMsg.innerText = msg;

	msgLog.appendChild(newMsg);

	msgLog.scrollTop = msgLog.scrollHeight;
}

/*
 * 
 * SAVE
 * 
 */

function saveGame() {
	var saveData = {resources : {}, tabs: {}, buttons: {}, milestones: {}, globals: {}, activeTab: null , debug: false}
	for (const [key, value] of game.resources) {
		saveData.resources[key] = [value.amount, value.visible];
	}
	for (const [key, value] of game.tabs) {
		saveData.tabs[key] = [value.visible];

		for (const [buttonKey, buttonValue] of value.buttons) {
			saveData.buttons[buttonKey] = [key, buttonValue.visible];
		}
	}
	for (const [key, value] of game.milestones) {
		saveData.milestones[key] =  [value.active];
    }

	for (const [key, value] of game.globals) {
		saveData.globals[key] = value;
	}

	saveData.activeTab = game.activeTab;

	saveData.debug = game.debug;

	localStorage.setItem('game', JSON.stringify(saveData));
}

/*
 * 
 * LOAD
 * 
 */

function loadGame() {
	const gameStr = localStorage.getItem('game');

	if (gameStr !== null) {
		var saveData = JSON.parse(gameStr);

		/*
		 * Set up all the stuff from the save
		 */

		// Resources [visible, amount]
		for (const res in saveData.resources) {
			game.resources.get(res).visible = saveData.resources[res][1];
			game.resources.get(res).amount = saveData.resources[res][0];
		}

		// Tabs [visible]
		for (const tab in saveData.tabs) {
			game.tabs.get(tab).visible = saveData.tabs[tab][0];
		}

		// Buttons [tab, visible]
		for (const button in saveData.buttons) {
			game.tabs.get(saveData.buttons[button][0]).buttons.get(button).visible = saveData.buttons[button][1];
		}

		// Globals [value]
		for (const global in saveData.globals) {
			game.globals.set(global, saveData.globals[global]); 
		}

		// Milestones [active]
		for (const milestone in saveData.milestones) {
			var curMilestone = game.milestones.get(milestone);
			curMilestone.active = saveData.milestones[milestone][0];
			
			// Some need to be checked when we load the game.
			if (curMilestone.checkOnLoad && curMilestone.test()) {
				curMilestone.event();
			}
		}

		// Debug mode
		game.debug = saveData.debug;

		updateUI();
		
		switchTab(saveData.activeTab);

	} else {
		// No savegame, start from the beginning
		unlockResource('sand');
		unlockResource('rocks');
		unlockTab('beach');
		unlockTab('ocean');

		switchTab('beach');

		game.tabs.get('beach').buttons.get('sand').visible = true;
		game.tabs.get('ocean').buttons.get('wet').visible = true;
		if (game.debug) {
			game.tabs.get('beach').buttons.get('cheat').visible = true;
		}
	}
}

function debugReset() {
	localStorage.removeItem('game');
	
	for (const[key, value] of game.resources) {
		value.amount = 0;
		value.visible = 0;
	}

	for (const[tabKey, tabValue] of game.tabs) {
		tabValue.visible = 0;
		for (const[buttonKey, buttonValue] of tabValue.buttons) {
			buttonValue.visible = false;
		}
	}

	for (const[key, value] of game.milestones) {
		value.active = true;
	}

	for (const[key, value] of game.globals) {
		game.globals.set(key, false);
	}

	loadGame();
	game.debug = true;
	saveGame();
	updateUI();
}