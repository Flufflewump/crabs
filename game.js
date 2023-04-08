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
	tabs: new Map(), resources: new Map(), milestones: new Map(), debug: false, activeTab: null
};


function GameTab(name, text, buttons) {
	this.name = name;
	this.text = text;
	this.buttons = buttons;
	this.unlocked = false;
	this.tabNode = null;
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
	this.unlocked = false;
}

Resource.prototype.toString = function () {
	return this.name;
}

function Button(text, func, enableTest = function () { return true; }) {
	this.text = text;
	this.func = func;
	this.node = null;
	this.visible = false;
	this.enableTest = enableTest;

	this.makeVisible = function (vis) {
		if (this.visible != vis) {
			this.visible = vis;
			if (vis) {
				// @ts-ignore
				this.visible = true;
			} else {
				// @ts-ignore
				this.visible = true;
			}
		}
	}
}

function Milestone(name, test, event) {
	this.name = name;
	this.test = test;
	this.event = event;
	this.unlocked = false;
}

// Create all the resources
game.resources.set('sand', new Resource('Sand'));
game.resources.set('rocks', new Resource('Rocks'));
game.resources.set('magic', new Resource('Magic'));

// And the tabs
game.tabs.set('beach', new GameTab('Beach', 'Sand and rocks line the beach', new Map([
	['sand', new Button('Gather sand', 'gatherButton()')],
	['sandcastle', new Button('Make sandcastle', 'makeSandcastle()', function () { return (game.resources.get('sand').amount >= 10) })]
])));
game.tabs.set('ocean', new GameTab('Ocean', 'The ocean is blue', new Map()));

// Milestones
game.milestones.set('sandCastleUnlock', new Milestone('sandCastleUnlock',
	function () { return (game.resources.get('sand').amount >= 10); },
	function () {
		log('You have a little pile of sand. You could make a sandcastle out of it');
		game.tabs.get('beach').buttons.get('sandcastle').makeVisible(true);
	}));

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
	for (var [milestoneName, value] of game.milestones) {
		var milestone = game.milestones.get(milestoneName);
		if (!milestone.unlocked && milestone.test()) {
			milestone.event();
			milestone.unlocked = true;
        }
    }

	updateUI();
}

function updateUI() {
	// Show unlocked resources
	for (const [resourceKey, resourceValue] of game.resources) {
		if (resourceValue.unlocked) {
			resourceValue.displayNode.classList.remove('locked');
			// Update displayed amount
			resourceValue.amountNode.innerText = resourceValue.amount;
        } else {
			resourceValue.displayNode.classList.add('locked');
		}
    }

	// Tabs
	for (const [tabKey, tabValue] of game.tabs) {
		if (tabValue.unlocked) {
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
			} else {
				buttonValue.node.classList.add('locked');
			}
		}
    }

	
}

/*
 * 
 * BUTTON FUNCTIONS
 * 
 */

function gatherButton() {
	addResource('sand', 1);
}

/*
 * 
 * HELPER FUNCTIONS: RESOURCES
 * 
 */

function addResource(resName, amount) {
	var res = game.resources.get(resName);
	res.amount += amount;

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
	res.unlocked = true;

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
	newTabPane.innerText = tab.text;

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

	tab.unlocked = true;	
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
	var saveData = {resources : {}, tabs: {}, buttons: {}, milestones: {}, activeTab: null , debug: false}
	for (const [key, value] of game.resources) {
		saveData.resources[key] = [value.amount, value.unlocked];
	}
	for (const [key, value] of game.tabs) {
		saveData.tabs[key] = [value.unlocked];

		for (const [buttonKey, buttonValue] of value.buttons) {
			saveData.buttons[buttonKey] = [key, buttonValue.visible];
		}
	}
	for (const [key, value] of game.milestones) {
		saveData.milestones[key] =  [value.unlocked];
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

		// Resources [unlocked, amount]
		for (const res in saveData.resources) {
			game.resources.get(res).unlocked = saveData.resources[res][1];
			game.resources.get(res).amount = saveData.resources[res][0];
		}

		// Tabs [unlocked]
		for (const tab in saveData.tabs) {
			game.tabs.get(tab).unlocked = saveData.tabs[tab][0];
		}

		// Buttons [tab, visible]
		for (const button in saveData.buttons) {
			game.tabs.get(saveData.buttons[button][0]).buttons.get(button).visible = saveData.buttons[button][1];
		}

		// Milestones [unlocked]
		for (const milestone in saveData.milestones) {
			game.milestones.get(milestone).unlocked = saveData.milestones[milestone][0];
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
	}

	game.tabs.get('beach').buttons.get('sand').makeVisible(true);
}

function debugReset() {
	localStorage.removeItem('game');
	loadGame();
	game.debug = true;
	saveGame();
}