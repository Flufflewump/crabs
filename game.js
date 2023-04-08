//@ts-check

var game = {
	tabs: new Map(), resources: new Map(), milestones: new Map(), debug: false, activeTab: null};

var msgLog;
var resourceList;
var tabList;
var paneList;
var statusMsg;

/*
 * 
 * Object Definitions
 * 
 */

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

	this.makeVisible = function(vis) {
		if (this.visible != vis) {
			this.visible = vis;
			if (vis) {
				// @ts-ignore
				this.node.classList.remove('locked');
			} else {
				// @ts-ignore
				this.node.classList.add('locked');
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
]) ));
game.tabs.set('ocean', new GameTab('Ocean', 'The ocean is blue', new Map()));

// Milestones
game.milestones.set('sandCastleUnlock', new Milestone('sandCastleUnlock',
	function () { log('checking to unlock sandcastles', true); return ( game.resources.get('sand').amount >= 10); },
	function () {
		log('You have a little pile of sand. You could make a sandcastle out of it');
		game.tabs.get('beach').buttons.get('castle').makeVisible(true);
	}));

/*
 * 
 * --------------------------------
 * 
 *	CONTENT LOADED AND GAME LOOP
 * 
 * --------------------------------
 * 
 * 
 */

document.addEventListener('DOMContentLoaded', function () {
	msgLog = document.getElementById('log');
	resourceList = document.getElementById('resources');
	tabList = document.getElementById('tabs');
	statusMsg = document.getElementById('status');

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

function update() {
	for (var [milestoneName, value] of game.milestones) {
		var milestone = game.milestones.get(milestoneName);
		if (!milestone.unlocked && milestone.test()) {
			milestone.event();
			milestone.unlocked = true;
        }
    }
}

/*
 * 
 * BUTTONS
 * 
 */

function gatherButton() {
	addResource('sand', 1);
}

function loadGame() {
	//localStorage.removeItem('game');
	const gameStr = localStorage.getItem('game');

	var tempGame
	if (gameStr !== null) {
		tempGame = JSON.parse(gameStr);
		tempGame.resources = arrayToMap(tempGame.resources);
		tempGame.tabs = arrayToMap(tempGame.tabs);
		tempGame.milestones = arrayToMap(tempGame.milestones);


		// Set up all the stuff from the save
		game.debug = tempGame.debug;
		for (const [resName, value] of tempGame.resources) {
			if (!value.unlocked) {
				continue;
            }

			if (game.resources.get(resName) == null) {
				log('Attempted to load non-existant resource ' + resName, true);
            }
			log('LOAD: unlocking ' + resName, true);
			unlockResource(resName);
			log('LOAD: adding ' + value.amount, true);
			addResource(resName, value.amount);
		}
		for (var [tab, value] of tempGame.tabs) {
			unlockTab(tab);
		}

		switchTab(tempGame.activeTab);
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

/*
 * Resources
 */

function addResource(resName, amount) {
	var res = game.resources.get(resName);
	res.amount += amount;

	res.amountNode.innerText = res.amount;

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

	log(res.displayNode);

	//Put it all together
	newResource.innerText = res.name + ': ';
	newResource.appendChild(newAmountNode);

	resourceList.appendChild(newResource);
}

function unlockResource(resName) {
	var res = game.resources.get(resName);
	res.unlocked = true;
	res.displayNode.classList.remove('locked');

	saveGame();
}

/*
 * 
 * Tabs
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

	// Keep it in game.tabs so it can be updated
	tab.tabNode = newTab;
	tab.paneNode = newTabPane;

	// Add them to the DOM
	tabList.appendChild(newTab);
	document.getElementById('panes').appendChild(newTabPane);

}

function unlockTab(name) {
	var tab = game.tabs.get(name);

	tab.unlocked = true;
	tab.tabNode.classList.remove('locked');
	tab.paneNode.classList.remove('locked');	
}

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

function saveGame() {

	// de-map the maps
	const jsonString = JSON.stringify(game, (key, value) => {
		if (value instanceof Map) {
			return [...value];
		}
		return value;
	});

	localStorage.setItem('game', jsonString);
}

function arrayToMap(array) {
	const map = new Map();
	array.forEach(([key, value]) => {
		map.set(key, value);
	});
	return map;
}