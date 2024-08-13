let socket = new WebSocket("ws://" + window.location.host + "/ws");
let selectedIcon = null;
let hasVoted = false;
let gameState = "voting";

socket.onmessage = function(event) {
    const data = JSON.parse(event.data);

    switch (data.type) {
        case 'icons':
            createIconButtons(shuffle(data.icons));
            break;
        case 'timer':
            document.getElementById('timer').textContent = data.value;
            break;
        case 'game_state':
            gameState = data.state;
            document.getElementById('message').textContent = `Game state: ${data.state}`;
            if (data.state === 'voting') {
                enableIcons();
                hasVoted = false;
                document.getElementById('selected-icon-container').style.display = 'flex';
                document.getElementById('vote-result').style.display = 'none';
                resetSelectedIconDisplay();
            } else {
                disableIcons();
            }
            break;
        case 'vote_result':
            document.getElementById('vote-result').style.display = 'flex';
            document.getElementById('selected-icon-container').style.display = 'none';
            displayVoteResult(data.icon, data.count);
            break;
    }
};

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};


function resetSelectedIconDisplay() {
    selectedIcon = null;
    document.getElementById('selected-icon-label').textContent = '';
    document.getElementById('selected-icon').innerHTML = '';
}

function createIconButtons(icons) {
    const container = document.getElementById('icon-container');
    container.innerHTML = '';
    const row = document.createElement('div');
    row.className = 'icon-row';
    container.appendChild(row);
    resetSelectedIconDisplay();


    icons.forEach((icon, index) => {
        const button = document.createElement('button');
        button.className = 'icon-btn';
        const iconElement = document.createElement('i');
        iconElement.className = icon;
        button.appendChild(iconElement);
        button.onclick = () => selectIcon(icon);
        row.appendChild(button);

        if ((index + 1) % 4 === 0 && index !== icons.length - 1) {
            const newRow = document.createElement('div');
            newRow.className = 'icon-row';
            container.appendChild(newRow);
        }
    });
}

function selectIcon(icon) {
    if (gameState === 'voting' && !hasVoted) {
        selectedIcon = icon;
        document.getElementById('selected-icon-label').textContent = 'You selected:';
        const iconElement = document.createElement('i');
        iconElement.className = icon;
        document.getElementById('selected-icon').innerHTML = '';
        document.getElementById('selected-icon').appendChild(iconElement);
        socket.send(JSON.stringify({ type: 'icon_selected', icon: icon }));
        disableIcons();
    }
}

function displayVoteResult(icon, count) {
    const resultContainer = document.getElementById('vote-result');
    resultContainer.innerHTML = '';
    const iconElement = document.createElement('i');
    iconElement.className = icon;
    resultContainer.appendChild(iconElement);
    resultContainer.appendChild(document.createTextNode(` Most voted (${count} votes)`));
}

function enableIcons() {
    const buttons = document.querySelectorAll('.icon-btn');
    buttons.forEach(button => button.disabled = false);
}

function disableIcons() {
    const buttons = document.querySelectorAll('.icon-btn');
    buttons.forEach(button => button.disabled = true);
}

socket.onopen = function(e) {
    console.log("WebSocket connection established");
    socket.send(JSON.stringify({ type: 'get_icons' }));
};
