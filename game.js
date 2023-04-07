//@ts-check

var game = {
	tabs: {}, resources: {}, debug: false, activeTab: null};

var msgLog;
var resourceList;
var tabList;
var paneList;
var statusMsg;

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

function Button(text, func) {
	this.text = text;
	this.func = func;
}

// Create all the resources
game.resources['sand'] = new Resource('Sand');
game.resources['rocks'] = new Resource('Rocks');
game.resources['magic'] = new Resource('Magic');
console.log('Resource list:');
console.log(game.resources);

// And the tabs
game.tabs['beach'] = new GameTab('Beach', 'Sand and rocks line the beach', [new Button('Gather sand', 'gatherButton()')]);
game.tabs['ocean'] = new GameTab('Ocean', 'The ocean is blue', []);


document.addEventListener('DOMContentLoaded', function () {
	msgLog = document.getElementById('log');
	resourceList = document.getElementById('resources');
	tabList = document.getElementById('tabs');
	statusMsg = document.getElementById('status');

	statusMsg.innerText = "You are a crab.";

	for (var res in game.resources) {
		createResourceDisplay(res);
	}

	for (var tab in game.tabs) {
		createTabDisplay(tab);
    }
	

	loadGame();
	saveGame();

	log('Loaded game!');
	log('Debug mode is ' + (game.debug ? 'enabled' : 'disabled'), true);
});

/*
 * 
 * BUTTONS
 * 
 */

function gatherButton() {
	addResource('sand', 1);
}

function loadGame() {

	const gameStr = localStorage.getItem('game');

	var tempGame
	if (gameStr !== null) {
		tempGame = JSON.parse(gameStr);

		// Set up all the stuff from the save
		game.debug = tempGame.debug;
		for (var resName in tempGame.resources) {
			if (!tempGame.resources[resName].unlocked) {
				continue;
            }

			if (game.resources[resName] == null) {
				log('Attempted to load non-existant resource ' + resName, true);
            }
			log('LOAD: unlocking ' + resName, true);
			unlockResource(resName);
			log('LOAD: adding ' + tempGame.resources[resName].amount, true);
			addResource(resName, tempGame.resources[resName].amount);
		}
		for (var tab in tempGame.tabs) {
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
}

/*
 * Resources
 */

function addResource(resName, amount) {
	var res = game.resources[resName];
	res.amount += amount;

	res.amountNode.innerText = res.amount;

	saveGame();
}

function createResourceDisplay(resName) {
	var res = game.resources[resName];

	log('Building resource display: ' + res, true);

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
	var res = game.resources[resName];
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
	log('Switching to tab ' + tabName, true);
	game.activeTab = tabName;

	var tab = game.tabs[tabName];


	for (var curTab in game.tabs) {
		game.tabs[curTab].tabNode.classList.remove('active');
		game.tabs[curTab].paneNode.classList.remove('active');
	}
	tab.tabNode.classList.add('active');
	tab.paneNode.classList.add('active');

	saveGame();
}

function createTabDisplay(tabName) {
	var tab = game.tabs[tabName];

	log('Building tab display: ' + tab, true);

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

	for (const button of tab.buttons) {
		var newButton = document.createElement('button');
		console.log(button.func);
		newButton.setAttribute('onclick', button.func);
		newButton.innerText = (button.text);
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
	var tab = game.tabs[name];

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
	localStorage.setItem('game', JSON.stringify(game));
}