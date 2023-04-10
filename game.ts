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
		tabs: new Map<string, GameTab>(), resources: new Map<string, Resource>(), 
		milestones: new Map<string, Milestone>(), buildings: new Map<string, Building>(), 
		globals: {
			oceanDrained : false,
			bucket : false,
			fancySandcastle : false,
			crabitalist: false,
			debug: true

		}, activeTab: null
	};

class GameTab {
	name: string;
	text: string;
	buttons: Map<string, Button>;
	visibleTest: Function;
	tabNode: HTMLElement;
	textNode: HTMLElement;
	paneNode: HTMLElement;

	constructor(name: string, text: string, buttons: Map<string, Button>, visibleTest) {
		this.name = name;
		this.text = text;
		this.buttons = buttons;
		this.visibleTest = visibleTest;
	}

	public toString = () : string => {
		return this.name;
	}
	
}

class Resource {
	name: string;
	singularName: string;
	amount: number;
	displayNode: HTMLElement;
	amountNode: HTMLElement;
	visibleTest: Function;

	constructor(name: string, singularName: string, visibleTest: Function) {
		this.name = name;
		this.singularName = singularName;
		this.amount = 0;
		console.log(visibleTest);
		this.visibleTest = visibleTest;
	}

	public toString = () : string => {
		return this.name;
	}
}

class Button {
	text: string;
	func: string;
	node: HTMLElement;
	visibleTest: Function;
	enableTest: Function;
	price: Price;

	constructor(text: string, func: string, visibleTest: Function = () => {return true}, enableTest: Function = () => { return true; }, price : Price = null) {
		this.text = text;
		this.price = price;
		this.func = func;
		this.visibleTest = visibleTest;
		this.enableTest = enableTest;
	}
}

class Milestone {
	name: string;
	test: Function;
	event: Function;
	active: boolean;

	constructor(name, test, event) {
		this.name = name;
		this.test = test;
		this.event = event;
		this.active = true;
	}
}

// May not really be a building, I just needed a name for "thing that ticks every tick"
class Building {
	name: string;
	singularName: string;
	update: Function;
	amount: number;

	constructor(name: string, singularName: string, update: Function) {
		this.name = name;
		this.singularName = singularName;
		this.update = update;
		this.amount = 0;
	}
}

class ResourceCost {
	resource: Resource;
	initial: number;
	increment: Function;
	constructor(resource: Resource, initial: number, increment: Function) {
		this.resource = resource;
		this.initial = initial;
		this.increment = increment;
	}

	calculate(iterations: number) {
		var tempPrice = this.initial;
		for (var i = 0; i < iterations; i++) {
			tempPrice = this.increment(tempPrice);
		}

		return Math.floor(tempPrice);
	}
}

class Price {
	costs: Array<ResourceCost>;
	iterations: Function;
	displayNode: HTMLElement;

	constructor(costs: Array<ResourceCost>, iterations: Function = () => {return 0}) {
		this.costs = costs;
		this.iterations = iterations;
	}
	
	toString() : string {
		let outString = '';

		for (var cost of this.costs) {
			let curCost = cost.calculate(this.iterations());
			outString += curCost + ' ' + (curCost == 1 ? cost.resource.singularName : cost.resource.name) + ', ';
		}

		outString = outString.slice(0, -2);
		return outString;
	}

	canAfford() : boolean {
		for (const curCost of this.costs) {
			if (curCost.resource.amount < curCost.calculate(this.iterations())) {
				return false;
			}
		}

		return true;
	}

	spend() : boolean {
		if (this.canAfford()) {
			for (const curCost of this.costs) {
				addResource(curCost.resource, -curCost.calculate(this.iterations()));
			}
			return true;
		} else {
			return false;
		}
		
	}

	updateNode() {
		if ( this.displayNode != null) {
			this.displayNode.textContent = this.toString();
		}
	}
}

/*******************************************
 *                                         *
 *                GAME DATA                *
 * 		all of the "stuff" goes here       *
 *                                         *
 *******************************************/

// Create all the resources
game.resources.set('sand', new Resource('Sand', 'Sand', () => {return true}));
game.resources.set('rocks', new Resource('Rocks', 'Rock', () => {return true}));
game.resources.set('wet', new Resource('Wet', 'Wet', () => {return game.resources.get('wet').amount >= 1}));
game.resources.set('sandcastles', new Resource('Sandcastles', 'Sandcastle', () => {return game.milestones.get('sandcastleUnlock').active == false;}));
game.resources.set('crabs', new Resource('Crabs', 'Crab', () => {return game.globals.fancySandcastle}));

// Prices
let prices = {
	sandcastle: new Price([
		new ResourceCost(game.resources.get('sand'), 10, constantPrice)], 
			() => game.resources.get('sandcastles').amount),
	fancySandcastle: new Price(
		[new ResourceCost(game.resources.get('sand'), 20, constantPrice),
		new ResourceCost(game.resources.get('rocks'), 2, constantPrice),
		new ResourceCost(game.resources.get('sandcastles'), 4, constantPrice)]),

	bucket: new Price([new ResourceCost(game.resources.get('sandcastles'), 20, constantPrice)]),

	room: new Price([
		new ResourceCost(game.resources.get('sand'), 5, (input:number) => {return game.buildings.get('crabs').amount})
	])
}

// Cost increment functions
function constantPrice(input) {
	return input;
}

// Buildings
game.buildings.set('crabs', new Building('Crabs', 'Crab', crabTick))


//TODO: build these in a better way. Make the buttons, put them in the map, pass it to game.tabs.set()
//		like building an HTMLElement

// And the tabs
game.tabs.set('beach', new GameTab('Beach', 'Sand and rocks line the beach', new Map([
	['sand', new Button('Gather sand', 'gatherButton()')],
	['cheat', new Button('Cheat!', 'cheat()', () => {return game.globals.debug})],
	['sandcastle', new Button('Build sandcastle', 'makeSandcastle()', () => {return (!game.milestones.get('sandcastleUnlock').active)}, () => {return prices.sandcastle.canAfford()}, prices.sandcastle)],
	['fancySandcastle', new Button('Build fancy sandcastle', 'makeFancySandcastle()', () => {return (game.globals.bucket && !game.globals.fancySandcastle)}, () => {return prices.fancySandcastle.canAfford()}, prices.fancySandcastle)]]),
	
	() => {return true}));
game.tabs.set('ocean', new GameTab('Ocean', 'The ocean is blue', new Map([
	['wet', new Button('Gather wet', 'gatherWet()', () => {return (!game.globals.oceanDrained)})]]),
	
	() => {return true}
	));
game.tabs.set('crabitalist', new GameTab('Crabitalist', 'The crabitalist wishes to buy and sell your goods', new Map([
	['buyBucket', new Button('Buy bucket', 'buyBucket()', () => {return !game.globals.bucket}, function() {return (prices.bucket.canAfford())}, prices.bucket)]]),
	
	() => {return game.globals.crabitalist}
	));

// Milestones
game.milestones.set('sandcastleUnlock', new Milestone('sandcastleUnlock',
	function () { return (game.resources.get('sand').amount >= 10); },
	function () {
		log('You have a little pile of sand. You could make a sandcastle out of it');
		this.active = false;
	})
);

game.milestones.set('tooMuchWet', new Milestone('tooMuchWet',
	function () { return (game.resources.get('wet').amount >= 99); },
	function () {
		log('Ocean ran out');
		game.globals.oceanDrained = true;
		this.active = false;
	})
);

game.milestones.set('unlockCrabitalist', new Milestone('unlockCrabitalist',
	function () { return (game.resources.get('sandcastles').amount >= 10); },
	function () {
		log('Your sandcastles have attracted the attention of a wealthy crabitalist');
		game.globals.crabitalist = true;
		this.active = false;
	})
);

/*
 *
 *	       CONTENT LOADED
 * 
 */

let gameLoop;

document.addEventListener('DOMContentLoaded', function () {
	msgLog = document.getElementById('log');
	resourceList = document.getElementById('resources');
	tabList = document.getElementById('tabs');
	statusMsg = document.getElementById('status');


	// ENABLE DEBUG MODE
	document.addEventListener('keypress', (event) => {
		if (event.key == 'd') {
			game.globals.debug = !game.globals.debug;
			log('Debug mode ' + (game.globals.debug ? 'enabled' : 'disabled'));
		}
	});


	statusMsg.innerText = "You are a crab.";

	for (const [key, value] of game.resources) {
		createResourceDisplay(key);
	}

	for (const [key, value] of  game.tabs) {
		createTabDisplay(key);
    }

	gameLoop = setInterval(update, 100);

	loadGame();
	saveGame();

	log('Loaded game!');
	log('Debug mode is ' + (game.globals.debug ? 'enabled' : 'disabled'), true);
});




/**********************************
 *                                *
 *	          GAME LOOP           *
 *                                *
 **********************************/

function update() {
	for (const [key, building] of game.buildings) {
		building.update();
	}
	checkMilestones();
	updateUI();
}

function updateUI() {
	// Show visible resources
	for (const [resourceKey, resourceValue] of game.resources) {
		if (resourceValue.visibleTest()) {
			resourceValue.displayNode.classList.remove('locked');
			// Update displayed amount
			resourceValue.amountNode.innerText = resourceValue.amount.toString();
        } else {
			resourceValue.displayNode.classList.add('locked');
		}
    }

	// Tabs
	for (const [tabKey, tabValue] of game.tabs) {
		if (tabValue.visibleTest()) {
			tabValue.tabNode.classList.remove('locked');
			tabValue.paneNode.classList.remove('locked');
        } else {
			tabValue.tabNode.classList.add('locked');
			tabValue.paneNode.classList.add('locked');
		}
		// Buttons
		for (const [buttonKey, buttonValue] of tabValue.buttons) {
			if (buttonValue.visibleTest()) {
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

		// Prices
		for (const price in prices) {
			prices[price].updateNode();
		}
    }
	
	if (!game.tabs.get(game.activeTab).visibleTest()) {
		for (const [tabName, tab] of game.tabs) {
			if (tab.visibleTest()) {
				switchTab(tabName);
				break;
			}
		}
	}
}

function checkMilestones() {
	for (var [key, milestone] of game.milestones) {
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
	addResourceName('sand', 1000);
	addResourceName('rocks', 100);
}

function gatherButton() {
	addResourceName('sand', 1);
	if (Math.random() < (1/244)) {
		addResourceName('rocks', 1);
		log('You found a cool rock in the sand')
	}
}

function makeSandcastle() {
	if (prices.sandcastle.spend()) {
		addResourceName('sandcastles', 1);
	}
}

function gatherWet() {
	addResourceName('wet', 1);
}

function buyBucket() {
	if (prices.bucket.spend()) {
		log('You have acquired a bucket');
		log('The Crabitalist has fled!');
		game.globals.bucket = true;
		game.globals.crabitalist = false;
	}
	saveGame();
}

function makeFancySandcastle() {
	if (prices.fancySandcastle.spend()) {
		log('A friendly crab moves into the fancy sandcastle and begins adding sand to your pile');
		game.globals.fancySandcastle = true;
		game.buildings.get('crabs').amount += 1;
		addResourceName('crabs', 1);


		// TODO: This should get disabled afterwords. Do that after overhauling how visibility is stored (again)
		// Globals work now. Woo. Now do it for buttons.
		// Done. yay. I'm leaving these comments for sentimental reasons.
	}
}

/********************************************
 *                                          *
 *                                          *
 *           BUILDING FUNCTIONS             *
 *                                          *
 *                                          *
 *******************************************/

function crabTick() {
	addResourceName('sand', game.buildings.get('crabs').amount);
}

/*
 * 
 * HELPER FUNCTIONS: RESOURCES
 * 
 */

function addResourceName(resName: string, amount: number) {
	addResource(game.resources.get(resName), amount);
}

function addResource(res: Resource, amount: number) {
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
	newAmountNode.innerText = res.amount.toString();

	// Keep it in game.resources so it can be updated
	res.displayNode = newResource;
	res.amountNode = newAmountNode;

	//Put it all together
	newResource.innerText = res.name + ': ';
	newResource.appendChild(newAmountNode);

	resourceList.appendChild(newResource);
}

/*
 * 
 * HELPER FUNCTIONS: TABS
 * 
 */

function switchTab(tabName) {
	game.activeTab = tabName;

	var tab = game.tabs.get(tabName);

	for (const [tabName, tab] of game.tabs) {
		tab.tabNode.classList.remove('active');
		tab.paneNode.classList.remove('active');
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

		if (button.price != null) {
			var priceDisplay = document.createElement('div');
			priceDisplay.classList.add('button-price');
			priceDisplay.textContent = button.price.toString();
			button.price.displayNode = priceDisplay;
			newButton.appendChild(priceDisplay);
		}

		button.node = newButton;

		buttonDiv.appendChild(newButton);
    }

	tab.tabNode = newTab;
	tab.paneNode = newTabPane;

	// Add them to the DOM
	tabList.appendChild(newTab);
	document.getElementById('panes').appendChild(newTabPane);

}

/*
 * 
 * LOGGING
 * 
 */

function log(msg, debug = false) {
	if (debug) {
		console.log(msg);
		if (!game.globals.debug) { return };
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
	var saveData = {resources : {}, buildings : {}, milestones: {}, globals: {}, activeTab: null}
	for (const [key, value] of game.resources) {
		saveData.resources[key] = value.amount;
	}
	for (const [key, value] of game.buildings) {
		saveData.buildings[key] = value.amount;
	}
	for (const [key, value] of game.milestones) {
		saveData.milestones[key] =  value.active;
    }

	for (const global in game.globals) {
		saveData.globals[global] = game.globals[global];
	}

	saveData.activeTab = game.activeTab;

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

		// Resources
		for (const res in saveData.resources) {
			game.resources.get(res).amount = saveData.resources[res];
		}

		for (const building in saveData.buildings) {
			game.buildings.get(building).amount = saveData.buildings[building];
		}

		// Globals
		for (const global in saveData.globals) {
			game.globals[global] = saveData.globals[global]; 
		}

		// Milestones
		for (const milestone in saveData.milestones) {
			var curMilestone = game.milestones.get(milestone);
			curMilestone.active = saveData.milestones[milestone];
		}
		
		switchTab(saveData.activeTab);

		updateUI();

	} else {
		// No savegame, start from the beginning

		switchTab('beach');
	}
}

function debugReset() {
	clearInterval(gameLoop);
	localStorage.removeItem('game');
	location.reload();
}