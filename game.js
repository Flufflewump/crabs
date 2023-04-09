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
    tabs: new Map(), resources: new Map(),
    milestones: new Map(), buildings: new Map(),
    globals: new Map(), debug: false, activeTab: null
};
class GameTab {
    constructor(name, text, buttons) {
        this.toString = () => {
            return this.name;
        };
        this.name = name;
        this.text = text;
        this.buttons = buttons;
        this.visible = false;
    }
}
class Resource {
    constructor(name, singularName) {
        this.toString = () => {
            return this.name;
        };
        this.name = name;
        this.singularName = singularName;
        this.amount = 0;
        this.visible = false;
    }
}
class Button {
    constructor(text, func, enableTest = function () { return true; }, price = null) {
        this.text = text;
        this.price = price;
        this.func = func;
        this.visible = false;
        this.enableTest = enableTest;
    }
}
class Milestone {
    constructor(name, test, event, checkOnLoad = false) {
        this.name = name;
        this.test = test;
        this.event = event;
        this.active = true;
        this.checkOnLoad = checkOnLoad;
    }
}
// May not really be a building, I just needed a name for "thing that ticks every tick"
class Building {
    constructor(name, singularName, update) {
        this.name = name;
        this.singularName = singularName;
        this.update = update;
        this.amount = 0;
    }
}
class ResourceCost {
    constructor(resource, initial, increment) {
        this.resource = resource;
        this.initial = initial;
        this.increment = increment;
    }
    calculate(iterations) {
        var tempPrice = this.initial;
        for (var i = 0; i < iterations; i++) {
            tempPrice = this.increment(tempPrice);
        }
        return Math.floor(tempPrice);
    }
}
class Price {
    constructor(costs, iterations = () => { return 0; }) {
        this.costs = costs;
        this.iterations = iterations;
    }
    toString() {
        let outString = '';
        for (var cost of this.costs) {
            let curCost = cost.calculate(this.iterations());
            outString += curCost + ' ' + (curCost == 1 ? cost.resource.singularName : cost.resource.name) + ', ';
        }
        outString = outString.slice(0, -2);
        return outString;
    }
    canAfford() {
        for (const curCost of this.costs) {
            if (curCost.resource.amount < curCost.calculate(this.iterations())) {
                return false;
            }
        }
        return true;
    }
    spend() {
        if (this.canAfford()) {
            for (const curCost of this.costs) {
                addResource(curCost.resource, -curCost.calculate(this.iterations()));
            }
            return true;
        }
        else {
            return false;
        }
    }
    updateNode() {
        if (this.displayNode != null) {
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
game.resources.set('sand', new Resource('Sand', 'Sand'));
game.resources.set('rocks', new Resource('Rocks', 'Rock'));
game.resources.set('wet', new Resource('Wet', 'Wet'));
game.resources.set('sandcastles', new Resource('Sandcastles', 'Sandcastle'));
game.resources.set('crabs', new Resource('Crabs', 'Crab'));
// Prices
let prices = {
    sandcastle: new Price([
        new ResourceCost(game.resources.get('sand'), 10, constantPrice)
    ], () => game.resources.get('sandcastles').amount),
    fancySandcastle: new Price([new ResourceCost(game.resources.get('sand'), 20, constantPrice),
        new ResourceCost(game.resources.get('rocks'), 2, constantPrice),
        new ResourceCost(game.resources.get('sandcastles'), 4, constantPrice)]),
    bucket: new Price([new ResourceCost(game.resources.get('sandcastles'), 20, constantPrice)]),
    room: new Price([
        new ResourceCost(game.resources.get('sand'), 5, (input) => { return game.buildings.get('crabs').amount; })
    ])
};
// Cost increment functions
function constantPrice(input) {
    return input;
}
// Buildings
game.buildings.set('crabs', new Building('Crabs', 'Crab', crabTick));
// And the tabs
game.tabs.set('beach', new GameTab('Beach', 'Sand and rocks line the beach', new Map([
    ['sand', new Button('Gather sand', 'gatherButton()')],
    ['cheat', new Button('Cheat!', 'cheat()')],
    ['sandcastle', new Button('Build sandcastle', 'makeSandcastle()', () => { return prices.sandcastle.canAfford(); }, prices.sandcastle)],
    ['fancySandcastle', new Button('Build fancy sandcastle', 'makeFancySandcastle()', () => { return prices.fancySandcastle.canAfford(); }, prices.fancySandcastle)]
])));
game.tabs.set('ocean', new GameTab('Ocean', 'The ocean is blue', new Map([
    ['wet', new Button('Gather wet', 'gatherWet()')]
])));
game.tabs.set('crabitalist', new GameTab('Crabitalist', 'The crabitalist wishes to buy and sell your goods', new Map([
    ['buyBucket', new Button('Buy bucket', 'buyBucket()', function () { return (!game.globals.get('bucket') && prices.bucket.canAfford()); }, prices.bucket)]
])));
// Milestones
game.milestones.set('sandCastleUnlock', new Milestone('sandCastleUnlock', function () { return (game.resources.get('sand').amount >= 10); }, function () {
    log('You have a little pile of sand. You could make a sandcastle out of it');
    game.tabs.get('beach').buttons.get('sandcastle').visible = true;
    this.active = false;
}, false));
game.milestones.set('tooMuchWet', new Milestone('tooMuchWet', function () { return (game.resources.get('wet').amount >= 99); }, function () {
    log('Ocean ran out');
    game.tabs.get('ocean').buttons.get('wet').visible = false;
    game.globals.set('oceanDrained', true);
    this.active = false;
}, false));
game.milestones.set('oceanDrained', new Milestone('oceanDrained', function () { return (game.globals.get('oceanDrained')); }, function () {
    game.tabs.get('ocean').textNode.textContent = "The ocean is blue and dry";
    this.active = false;
}, true));
game.milestones.set('oceanBack', new Milestone('oceanBack', function () { return (!game.globals.get('oceanDrained')); }, function () {
    game.tabs.get('ocean').textNode.textContent = "The ocean is blue";
    this.active = false;
}, true));
game.milestones.set('unlockCrabitalist', new Milestone('unlockCrabitalist', function () { return (game.resources.get('sandcastles').amount >= 10); }, function () {
    log('Your sandcastles have attracted the attention of a crabitalist');
    game.tabs.get('crabitalist').visible = true;
    game.tabs.get('crabitalist').buttons.get('buyBucket').visible = true;
    this.active = false;
}, false));
game.milestones.set('boughtBucket', new Milestone('boughtBucket', function () { return (game.globals.get('bucket')); }, function () {
    log('The crabitalist has fled!');
    game.tabs.get('crabitalist').visible = false;
    game.tabs.get('beach').buttons.get('fancySandcastle').visible = true;
    switchTab('beach');
    this.active = false;
}, false));
// Globals
game.globals.set('oceanDrained', false);
game.globals.set('bucket', false);
game.globals.set('fancySandcastle', false);
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
            game.debug = !game.debug;
            log('Debug mode ' + (game.debug ? 'enabled' : 'disabled'));
        }
    });
    statusMsg.innerText = "You are a crab.";
    for (const [key, value] of game.resources) {
        createResourceDisplay(key);
    }
    for (const [key, value] of game.tabs) {
        createTabDisplay(key);
    }
    gameLoop = setInterval(update, 100);
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
    for (const [key, building] of game.buildings) {
        building.update();
    }
    checkMilestones();
    updateUI();
}
function updateUI() {
    // Show visible resources
    for (const [resourceKey, resourceValue] of game.resources) {
        if (resourceValue.visible) {
            resourceValue.displayNode.classList.remove('locked');
            // Update displayed amount
            resourceValue.amountNode.innerText = resourceValue.amount.toString();
        }
        else {
            resourceValue.displayNode.classList.add('locked');
        }
    }
    // Tabs
    for (const [tabKey, tabValue] of game.tabs) {
        if (tabValue.visible) {
            tabValue.tabNode.classList.remove('locked');
            tabValue.paneNode.classList.remove('locked');
        }
        else {
            tabValue.tabNode.classList.add('locked');
            tabValue.paneNode.classList.add('locked');
        }
        // Buttons
        for (const [buttonKey, buttonValue] of tabValue.buttons) {
            if (buttonValue.visible) {
                buttonValue.node.classList.remove('locked');
                if (buttonValue.enableTest()) {
                    buttonValue.node.classList.remove('disabled');
                }
                else {
                    buttonValue.node.classList.add('disabled');
                }
            }
            else {
                buttonValue.node.classList.add('locked');
            }
        }
        // Prices
        for (const price in prices) {
            prices[price].updateNode();
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
    addResourceName('sand', 1000);
}
function gatherButton() {
    addResourceName('sand', 1);
    if (Math.random() < (1 / 244)) {
        addResourceName('rocks', 1);
        log('You found a cool rock in the sand');
    }
}
function makeSandcastle() {
    if (prices.sandcastle.spend()) {
        unlockResource('sandcastles');
        addResourceName('sandcastles', 1);
    }
}
function gatherWet() {
    unlockResource('wet');
    addResourceName('wet', 1);
}
function buyBucket() {
    if (prices.bucket.spend()) {
        log('You have acquired a bucket');
        game.tabs.get('crabitalist').buttons.get('buyBucket').visible = false;
        game.globals.set('bucket', true);
    }
    saveGame();
}
function makeFancySandcastle() {
    if (prices.fancySandcastle.spend()) {
        log('A friendly crab moves into the fancy sandcastle and begins adding sand to your pile');
        game.buildings.get('crabs').amount += 1;
        unlockResource('crabs');
        addResourceName('crabs', 1);
        // TODO: This should get disabled afterwords. Do that after overhauling how visibility is stored (again)
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
function addResourceName(resName, amount) {
    addResource(game.resources.get(resName), amount);
}
function addResource(res, amount) {
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
        if (!game.debug) {
            return;
        }
        ;
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
    var saveData = { resources: {}, buildings: {}, tabs: {}, buttons: {}, milestones: {}, globals: {}, activeTab: null, debug: false };
    for (const [key, value] of game.resources) {
        saveData.resources[key] = [value.amount, value.visible];
    }
    for (const [key, value] of game.buildings) {
        saveData.buildings[key] = [value.amount];
    }
    for (const [key, value] of game.tabs) {
        saveData.tabs[key] = [value.visible];
        for (const [buttonKey, buttonValue] of value.buttons) {
            saveData.buttons[buttonKey] = [key, buttonValue.visible];
        }
    }
    for (const [key, value] of game.milestones) {
        saveData.milestones[key] = [value.active];
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
        for (const building in saveData.buildings) {
            game.buildings.get(building).amount = saveData.buildings[building][0];
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
    }
    else {
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
    clearInterval(gameLoop);
    localStorage.removeItem('game');
    location.reload();
}
//# sourceMappingURL=game.js.map