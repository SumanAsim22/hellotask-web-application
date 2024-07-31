window.onload = startFunction();

/* Upon window load, the startFunction will send an API fetch call to the server 
    script app.js in order to retrieve the task list associated with the user 
    that has logged in. Using this list, the browser will load the user's tasks
    as task entries, with their details, in the relevant containers. */
function startFunction(){
    fetch('/api/tasklist')
    .then(response => response.json())
    .then(data => {
          //set token goal value to user's token goal from database(default value is zero)
          tokenGoal.innerHTML = data.tokengoal;
          //set taskArray variable equal to user's tasks retrieved from database
          let tasklist = data.tasklist;
          taskArray = tasklist;
          //iterate over all tasks and load entries in browser window
          if(tasklist.length != 0){
            for(i = 0; i < tasklist.length; i++){
                let id = tasklist[i]._id;
                let title = tasklist[i].title;
                let tokens = tasklist[i].tokens;
                let priority = tasklist[i].priority;
                let status = tasklist[i].status;
                createTaskEntry(id, title, tokens, priority, status);
            }       
          } else {return;}
    })
    .catch(error => console.error('Error fetching data:', error));
}

/* Global variables */
let taskArray = [];
let addTaskForm = document.getElementsByClassName('modal-form')[0];
let modifyTaskForm = document.getElementsByClassName('modal-form')[1];
let tokenGoalsDisplay = document.getElementsByClassName('modal-form')[2];
let taskDetailsContainer = document.getElementById('task-details-container');
let goalInputArea = document.getElementById('goal-input');
let tokenGoal = document.getElementById('token-goal');

//retrieve buttons and add 'on click' event listeners 
let closeBtn = document.getElementsByClassName('close-btn')[0]; 
let cancelBtn = document.getElementsByClassName('cancel-btn'); //get array of class buttons
let addTaskBtn = document.getElementsByClassName('add-task-btn')[0]; 
let createTaskBtn = document.getElementsByClassName('create-task-btn')[0]; 
let updateTaskBtn = document.getElementsByClassName('update-task-btn')[0];
let tokenGoals = document.getElementsByClassName('token-goals')[0];
let setGoalBtn = document.getElementById('set-goal-btn');
let updateGoalBtn = document.getElementById('update-goal-btn');

for(i = 0; i < cancelBtn.length; i++){
    cancelBtn[i].addEventListener('click', cancelBtnClicked);
}
closeBtn.addEventListener('click', closeBtnClicked);
addTaskBtn.addEventListener('click', addTaskClicked);
createTaskBtn.addEventListener('click', createTaskClicked);
updateTaskBtn.addEventListener('click', updateTaskClicked);
tokenGoals.addEventListener('click', tokenGoalsClicked);
setGoalBtn.addEventListener('click', setGoalClicked);
updateGoalBtn.addEventListener('click', updateGoalClicked);

//when 'Add Task' button is clicked, show task creation form
function addTaskClicked(){
    //close other modal forms first if they are open
    modifyTaskForm.hidden = true;
    tokenGoalsDisplay.hidden = true;
    //display form
    addTaskForm.hidden = false;
    //get task title input area and activate it to enable immediate text input
    titleInput = document.getElementById('title-add');
    titleInput.focus();
}

/* General function for all cancel buttons */
//when 'Cancel' button is clicked, hide corresponding modal display 
function cancelBtnClicked(){
    addTaskForm.hidden = true;
    modifyTaskForm.hidden = true;
    tokenGoalsDisplay.hidden = true;
    /* In the case of the Add Task form, the function also sets 
        all input and selection values back to default */
    setDefaultValues();
}

//execute when 'Create' button is clicked
async function createTaskClicked(){
    //assign individual task details to corresponding variables
    let taskTitle = document.getElementById('title-add').value;
    let taskDescription = document.getElementById('description-add').value;
    let taskTokens = document.getElementById('tokens-selector-add').value;
    let taskPriority = document.querySelector('input[name="priority-add"]:checked').value;
    let taskStatus = 'to-do';

    //alert user if title field is empty and prevent task from being created
    if(taskTitle == ''){
        alert('Please enter a title.');
        return;
    }
    //retrieve and iterate through all exisitng task titles in the task array to find duplicate
    let taskTitleArray = document.getElementsByClassName('title');
    for (let i = 0; i < taskTitleArray.length; i++) {
        //compare existing titles to new task title added
        if (taskTitleArray[i].innerHTML === taskTitle ) {
            //confirm user decision to use duplicate title
            let userConfirmation = confirm('This task title already exists. Do you still want to use this title?');
            if(!userConfirmation){
                //if user does not want to use the title, return to form
                return;
            }
        }
    }

    //send task data to server application app.js
    const data = {
        title: taskTitle,
        description: taskDescription,
        tokens: taskTokens,
        priority: taskPriority,
        status: taskStatus
    };
    //add new task to database through a fetch POST
    fetch('/api/newtask', {
    method: 'POST',
    headers: {
    'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
    })
    .then((response) => response.json())
    //get new task details back from database entry as result
    .then((result) => {
        console.log('Database update successful: Task added successfully');
        const newTaskIndex = result.length - 1; //get index of last element entered in database
        const newTaskId = result[newTaskIndex]._id; //set new task id equal to database-generated id
        const newTask = {
            _id: newTaskId,
            title: taskTitle,
            description: taskDescription,
            tokens: Number(taskTokens), //convert string value of token to number 
            priority: taskPriority,
            status: taskStatus }; 
        //update taskArray with new task
        taskArray.push(newTask);
        //pass retrieved values as arguments to function createTaskEntry
        createTaskEntry(newTaskId, taskTitle, taskTokens, taskPriority, taskStatus);
    })
    .catch((error) => {
        console.error('Error updating database:', error);
    });
    //call function to set all input values back to default
    setDefaultValues();
    addTaskForm.hidden = true;
}

//create task entry in the browser
function createTaskEntry(id, taskTitle, tokens, priority, status){
    //create a new div element for the task created and add to class 'task'
    let newTask = document.createElement('div');
    newTask.classList.add('task');
    //set task container boundary color according to task priority
    if (priority == 'high'){
        color = 'crimson';
    }
    else if (priority == 'medium') {
        color = 'orange';
    } else if(priority == 'low'){
        color = '#ede844';
    }
    else{ //in case of no priority, keep color default
        color = 'whitesmoke'
    }
    //get corresponding status container of task being created
    let container = document.getElementsByClassName(status)[0];
    /* New div element layout */
    let newTaskContent = ''
    if(status == 'completed'){ //do not display task tokens
        newTaskContent = `
            <div class = "task-id">${id}</div>
            <input type="checkbox" class="status-change" checked>
            <div class="title" style="border: 2.5px solid ${color};">${taskTitle}</div>`
    } else{ //if status is to-do or in-progress, display task tokens
        newTaskContent = `
            <div class = "task-id">${id}</div>
            <input type="checkbox" class="status-change">
            <div class="title" style="border: 2.5px solid ${color};">${taskTitle}</div>
            <img src="/token.png" alt="token-icon" class="token-icon">
            <div class="token-number" style="font-size: 14px">${tokens}</div>`
    }
    //set styling to task div
    newTask.innerHTML = newTaskContent;
    //append the new div to the corresponding status container
    container.append(newTask);
    //add event listeners to the task title area and the status change checkbox
    titleDiv = newTask.getElementsByClassName('title')[0];
    titleDiv.addEventListener('click', viewTaskDetails);
    statusChange = newTask.getElementsByClassName('status-change')[0];
    statusChange.addEventListener('click', changeTaskStatus);
    //close details container (if open) when status change is clicked
    /* this will prevent the previous status value from still being displayed  
        even after the status has been changed */
    statusChange.addEventListener('click', closeBtnClicked);
}

//display all the task's details
function viewTaskDetails(event){
    let taskClicked = event.target.parentElement;
    //set detail variables equal to corresponding values
    taskid = taskClicked.getElementsByClassName('task-id')[0];
    detailsID = taskDetailsContainer.getElementsByClassName('details-id')[0];
    detailsTitle = taskDetailsContainer.getElementsByClassName('details-title')[0];
    detailsTokens = taskDetailsContainer.getElementsByClassName('details-tokens')[0];
    detailsDescription = taskDetailsContainer.getElementsByClassName('details-description')[0];
    detailsPriority = taskDetailsContainer.getElementsByClassName('details-priority')[0];
    detailsStatus = taskDetailsContainer.getElementsByClassName('details-status')[0];
    for(i = 0; i < taskArray.length; i++){
        id = taskArray[i]._id;
        if(id == taskid.innerHTML){
            detailsID.innerHTML = id;
            //display all details with corresponding labels
            const titleLabel = `<label class="details-label">Title: </label>`;
            detailsTitle.innerHTML = titleLabel.concat(taskArray[i].title);
            const descriptionLabel = `<label class="details-label">Description: </label>`;
            detailsDescription.innerHTML = descriptionLabel.concat(taskArray[i].description);
            const tokensLabel = `<label class="details-label">Tokens: </label>`;
            detailsTokens.innerHTML = tokensLabel.concat(taskArray[i].tokens);
            const priorityLabel = `<label class="details-label">Priority: </label>`;
            detailsPriority.innerHTML = priorityLabel.concat(taskArray[i].priority);
            const statusLabel = `<label class="details-label">Status: </label>`;
            detailsStatus.innerHTML = statusLabel.concat(taskArray[i].status);
            //get buttons div of task details container
            buttonsContainer = document.getElementsByClassName('buttons-container')[0];
            //display 'modify' and 'delete' button icons if task status is not 'Completed'
            if(taskArray[i].status != 'completed'){
                buttonsContainer.innerHTML = 
                `<button class="btn modify-btn" title="Modify task">
                    <img src="/modify.png" alt="modify-icon" style="height: 20px; width: auto;">
                </button>
                <button class="btn red-btn delete-btn" title="Delete task">
                    <img src="/trash-can.png" alt="trash-icon" style="height: 20px; width: auto;">
                </button>`
                //add event listeners to buttons
                let modifyBtn = document.getElementsByClassName('modify-btn')[0];
                modifyBtn.addEventListener('click', modifyTaskClicked);
                let deleteTaskBtn = document.getElementsByClassName('delete-btn')[0];
                deleteTaskBtn.addEventListener('click', deleteTaskClicked);
            }
            else{ //if task is completed, hide modify button
                buttonsContainer.innerHTML = 
                `<button class="btn red-btn delete-btn" title="Delete task">
                    <img src="/trash-can.png" alt="trash-icon" style="height: 20px; width: auto;">
                </button>`
                //add event listener to delete button 
                let deleteTaskBtn = document.getElementsByClassName('delete-btn')[0];
                deleteTaskBtn.addEventListener('click', deleteTaskClicked);
            }
        }
    }      
    //show the task detail container
    taskDetailsContainer.hidden = false;
}

//when close button is clicked, hide task details container
function closeBtnClicked(){
    taskDetailsContainer.hidden = true;
}

//change input areas to default values
function setDefaultValues(){
    document.getElementById('title-add').value = '';
    document.getElementById('description-add').value = '';
    document.getElementById('tokens-selector-add').value = 1;
    //set default priority selection to none i.e. third index element of priority selection
    const priorityOptions = document.querySelectorAll('[name="priority-add"]');
    priorityOptions[3].checked = true;
}

//when delete button is clicked, hide task details container and update window and database
function deleteTaskClicked(){
    //get user confirmation for deletion
    let deletionConfirmation = confirm('Are you sure you want to delete this task?');
    if(!deletionConfirmation){
        //if user does not want to delete the task, exit function
        return;
    }
    //get task id of task to be deleted
    const detailsId = taskDetailsContainer.getElementsByClassName('details-id')[0].innerHTML;
    //get array of all task ids
    const taskIdArray = document.getElementsByClassName('task-id');
    //iterate over the task array to find corresponsing task to be deleted via id match
    for(i = 0; i < taskArray.length; i++){
        id = taskArray[i]._id;
        if(id == detailsId){
            const index = i; //get index of task in task array
            taskArray.splice(index, 1); //remove task from task list
            element = taskIdArray[i].parentElement;
            element.remove(); //remove task from display
            deleteTask(); //call function to update database
        }
    }   
    taskDetailsContainer.hidden = true;
}

//delete task from the database
function deleteTask(){
    //send updated taskArray to server script app.js
    const data = {
        tasklist: taskArray
    };
    fetch('/api/deleteTask', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((result) => {
    console.log('Database update successful:', result);
    })
    .catch((error) => {
    console.error('Error updating database:', error);
    });
}

//change task status when checkbox is clicked
function changeTaskStatus(event){
    const taskClicked = event.target.parentElement;
    const taskid = taskClicked.getElementsByClassName('task-id')[0].innerHTML;
    let taskStatus = '';
    //get task status
    for(i = 0; i < taskArray.length; i++){
        //find corresponding task in task array and retrieve task status
        id = taskArray[i]._id;
        if(id == taskid){
            taskStatus = taskArray[i].status;
            //change task status to subsequent state
            if(taskStatus == 'to-do'){ 
                taskArray[i].status = 'in-progress';
            } else if(taskStatus == 'in-progress'){
                taskArray[i].status = 'completed'
            } else{//if status == completed
                taskArray[i].status = 'to-do'
            }
            taskClicked.remove(); //remove task div from current status container
            //update task status in database
            updateDatabase(taskArray[i]._id, taskArray[i].title, taskArray[i].description, 
                taskArray[i].tokens, taskArray[i].priority, taskArray[i].status);
            //create task entry in next status container
            createTaskEntry(taskArray[i]._id, taskArray[i].title, taskArray[i].tokens, 
                taskArray[i].priority, taskArray[i].status);
        }
    }
}

//open task modification form to enable changing task details 
function modifyTaskClicked(event){
    let taskToUpdate = event.target.parentElement.parentElement;
    //get id of task to update
    let updateID = taskToUpdate.getElementsByClassName('details-id')[0].innerHTML;
    //get task title value
    let fullTitleValue = taskToUpdate.getElementsByClassName('details-title')[0].innerText;
    let colonIndex = fullTitleValue.indexOf(':') //get index of colon character 
    let title = fullTitleValue.substring(colonIndex + 2);
    //get task description value
    let fullDescrValue = taskToUpdate.getElementsByClassName('details-description')[0].innerText;
    colonIndex = fullDescrValue.indexOf(':') 
    let description = fullDescrValue.substring(colonIndex + 2);
    //get task tokens value
    let fullTokensValue = taskToUpdate.getElementsByClassName('details-tokens')[0].innerText;
    colonIndex = fullTokensValue.indexOf(':') 
    let tokens = fullTokensValue.substring(colonIndex + 2);
    //get task priority value
    let fullPriorityValue = taskToUpdate.getElementsByClassName('details-priority')[0].innerText;
    colonIndex = fullPriorityValue.indexOf(':')
    let priority = fullPriorityValue.substring(colonIndex + 2);
    if(priority == 'high'){index = 0;}
    else if(priority == 'medium'){index = 1;}
    else if(priority == 'low'){index = 2;}
    else{index = 3;}
    //get status value
    let fullStatusValue = taskToUpdate.getElementsByClassName('details-status')[0].innerText
    colonIndex = fullStatusValue.indexOf(':') //get index of colon character 
    let status = fullStatusValue.substring(colonIndex + 2);

    //close other modal forms if they are open
    addTaskForm.hidden = true;
    tokenGoalsDisplay.hidden = true;
    //display form
    modifyTaskForm.hidden = false;
    //get title-input text area and activate it to enable immediate text input
    titleInput = document.getElementById('title-modify');
    titleInput.focus();
    //pre-enter task details in input areas
    document.getElementById('task-update-id').value = updateID;
    document.getElementById('title-modify').value = title;
    document.getElementById('description-modify').value = description;
    document.getElementById('tokens-selector-modify').value = tokens;
    const priorityOptions = document.querySelectorAll('[name="priority-modify"]');
    priorityOptions[index].checked = true;
    document.getElementById('task-update-status').value = status;
}

//get input values from 'Modify Task' form and trigger updates
function updateTaskClicked(event){
    let taskid = document.getElementById('task-update-id').value; 
    let updatedTitle = document.getElementById('title-modify').value;
    let updatedDescription = document.getElementById('description-modify').value;
    let updatedTokens = document.getElementById('tokens-selector-modify').value;
    let updatedPriority = document.querySelector('input[name="priority-modify"]:checked').value;
    let status = document.getElementById('task-update-status').value;
    
    //alert user if title field is empty and prevent task from being updated
    if(updatedTitle == ''){
        alert('Please enter a title.');
        return;
    }
    for(i = 0; i < taskArray.length; i++){
        if(taskArray[i]._id == taskid){
            let exisitingTitle = taskArray[i].title;
            //retrieve and iterate through all exisitng task titles in the task array to find duplicate
            let taskTitleArray = document.getElementsByClassName('title');
            for (let i = 0; i < taskTitleArray.length; i++) {
                //compare task title to all other tasks in the array (except the task title itself)
                if ((updatedTitle != exisitingTitle) && (taskTitleArray[i].innerHTML === updatedTitle)) {
                    //confirm user decision to use duplicate title
                    let userConfirmation = confirm('This task title already exists. Do you still want to use this title?');
                    if(!userConfirmation){
                        //if user does not want to use the title, return to form
                        return;
                    }
                }
            }
            //update task array
            taskArray[i].title = updatedTitle;
            taskArray[i].description = updatedDescription;
            taskArray[i].tokens = updatedTokens;
            taskArray[i].priority = updatedPriority;
        }
    }
    //update corresponding task entry in database
    updateDatabase(taskid, updatedTitle, updatedDescription, updatedTokens, updatedPriority, status);
    modifyTaskForm.hidden = true; //hide form
    location.reload(); //reload page to implement updates
}

//send updated task details to database 
function updateDatabase(taskid, taskTitle, taskDescription, taskTokens, taskPriority, taskStatus){
    //create task object with updated task details
    const updatedTask = {
        _id: taskid,
        title: taskTitle,
        description: taskDescription,
        tokens: taskTokens,
        priority: taskPriority,
        status: taskStatus }; 
    fetch('/api/updateTask', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedTask),
        })
        .then((response) => response.json())
        .then((result) => {
            console.log('Database update successful: ', result);
        })
        .catch((error) => {
            console.error('Error updating database:', error);
        });
}

//open form to view and update token goal
function tokenGoalsClicked(){
    //close other modal forms if they are open
    addTaskForm.hidden = true;
    modifyTaskForm.hidden = true;
    //display container
    tokenGoalsDisplay.hidden = false;

    let tokensAvailable = 0;
    let tokensAchieved = 0;
    //get total tokens currently available from user's to-do and in-progress lists
    for(i = 0; i < taskArray.length; i++){
        if(taskArray[i].status != 'completed'){
            tokensAvailable = tokensAvailable + taskArray[i].tokens;
        }else{ //if task status is completed, update tokensAchieved variable
            tokensAchieved = tokensAchieved + taskArray[i].tokens;
        }
    }
    //set corresponding values
    document.getElementById('tokens-available').innerHTML = tokensAvailable;
    document.getElementById('tokens-achieved').innerHTML = tokensAchieved;
    //calculate difference between token goal and tokens achieved
    let difference = tokenGoal.innerHTML - tokensAchieved;
    if(tokenGoal.innerHTML != 0 && difference == 0){
        //send user congratulatory message upon completion of goal
        alert('Congratulations! You have achieved your token goals for this week!');        
    }
    if(difference < 0){ //if user has achieved more than the set goal, set difference to 0
        difference = 0;
    }
    document.getElementById('tokens-remaining').innerHTML = difference;
}

//enable token goal modification by displaying input container
function setGoalClicked(){ 
    //hide close button
    document.getElementsByClassName('close-btn')[1].hidden = true;
    //place current token goal value in input area
    goalInputArea.value = tokenGoal.innerHTML;
    //hide set goal button and hide token goal value
    setGoalBtn.hidden = true;
    tokenGoal.hidden = true;
    //display goal input area and 'Update' button 
    goalInputArea.hidden = false;
    updateGoalBtn.hidden = false;
}

//update token goal value
function updateGoalClicked(){
    //get user input value
    let goalInput = goalInputArea.value;
    if(goalInput == ''){
        return; //if input was left empty, make no changes
    }
    tokenGoal.innerHTML = goalInput; //set token goal equal to input area value
    //show close button
    document.getElementsByClassName('close-btn')[1].hidden = false;
    //hide update goal button and hide goal input area
    updateGoalBtn.hidden = true;
    goalInputArea.hidden = true;
    //display token goal value and 'Set Goal' button 
    tokenGoal.hidden = false;
    setGoalBtn.hidden = false;
    //update related token goal values
    tokenGoalsClicked();
    //update token goal in database (this will enable the correct goal to be displayed upon every refresh and login)
    updateGoalDatabase(Number(tokenGoal.innerHTML));
}

//update user's token goal in database 
function updateGoalDatabase(goal){
    const updatedGoal = {
        value: goal
    }
    fetch('/api/updateGoal', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedGoal),
        })
        .then((response) => response.json())
        .then((result) => {
            console.log('Goal update successful: ', result);
        })
        .catch((error) => {
            console.error('Error updating goal:', error);
        });
}