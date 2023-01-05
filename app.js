const express = require("express");
const app = express();
app.use(express.json());

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const path = require("path");

const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;

const initiateDbAndServer = async () => {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
  app.listen(3000, () => {
    console.log("Server Running at http://localhost:3000/");
  });
};
initiateDbAndServer();

const invalidScenarios = (request, response, next) => {
  const {
    status = "%%",
    priority = "%%",
    search_q = "%%",
    category = "%%",
    date = "%%",
  } = request.query;

  const isDateValid = isValid(new Date(date));

  if (
    status != "%%" &&
    status != "TO DO" &&
    status != "IN PROGRESS" &&
    status != "DONE"
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    priority != "%%" &&
    priority != "HIGH" &&
    priority != "MEDIUM" &&
    priority != "LOW"
  ) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    category != "%%" &&
    category != "WORK" &&
    category != "HOME" &&
    category != "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (date != "%%" && !isDateValid) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};

//API TO GET MULTIPLE TODO
app.get("/todos/", invalidScenarios, async (request, response) => {
  const {
    status = "%%",
    priority = "%%",
    search_q = "%%",
    category = "%%",
  } = request.query;
  const convertDbObjectToResponseObject = (dbObject) => {
    return {
      id: dbObject.id,
      todo: dbObject.todo,
      priority: dbObject.priority,
      status: dbObject.status,
      category: dbObject.category,
      dueDate: dbObject.due_date,
    };
  };
  const getTodosQuery = `
        SELECT *
        FROM todo
        WHERE todo LIKE '%${search_q}%' AND
              status LIKE '${status}' AND 
              priority LIKE '${priority}' AND
              category LIKE '${category}';
    `;
  const todosArray = await db.all(getTodosQuery);
  response.send(
    todosArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
  );
});

//API TO GET TODO BASED ON TODO_ID
app.get("/todos/:todoId/", invalidScenarios, async (request, response) => {
  const { todoId } = request.params;
  console.log(todoId);
  const getTodoQuery = `
        SELECT *
        FROM todo
        WHERE id = ${todoId};
    `;
  const convertDbObjectToResponseObject = (dbObject) => {
    return {
      id: dbObject.id,
      todo: dbObject.todo,
      priority: dbObject.priority,
      status: dbObject.status,
      category: dbObject.category,
      dueDate: dbObject.due_date,
    };
  };
  const todoObject = await db.get(getTodoQuery);
  response.send(convertDbObjectToResponseObject(todoObject));
});

//API TO GET TODOS WITH SPECIFIC DUE_DATE
app.get("/agenda/", invalidScenarios, async (request, response) => {
  const { date } = request.query;
  const isValidDate = isValid(new Date(date));
  if (isValidDate === true) {
    const formattedDate = format(new Date(date), "yyyy-MM-dd");
    const getTodoQuery = `
        SELECT *
        FROM todo 
        WHERE due_date LIKE '${formattedDate}'; 
    `;
    const convertDbObjectToResponseObject = (dbObject) => {
      return {
        id: dbObject.id,
        todo: dbObject.todo,
        priority: dbObject.priority,
        status: dbObject.status,
        category: dbObject.category,
        dueDate: dbObject.due_date,
      };
    };
    const todosArray = await db.all(getTodoQuery);
    response.send(
      todosArray.map((eachTodo) => convertDbObjectToResponseObject(eachTodo))
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

//API TO CREATE A TODO
app.post("/todos/", invalidScenarios, async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  const allowedStatuses = ["TO DO", "IN PROGRESS", "DONE"];
  const allowedPriorities = ["HIGH", "MEDIUM", "LOW"];
  const allowedCategories = ["WORK", "HOME", "LEARNING"];
  const isDateValid = isValid(new Date(dueDate));

  if (status && !allowedStatuses.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (priority && !allowedPriorities.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (category && !allowedCategories.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    if (isDateValid === true) {
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const createTodoQuery = `
                INSERT INTO todo (id, todo, category, priority, status, due_date)
                VALUES (
                    ${id},
                    '${todo}',
                    '${category}',
                    '${priority}',
                    '${status}',
                    '${formattedDate}'
                );
            `;
      await db.run(createTodoQuery);
      response.send("Todo Successfully Added");
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  }
});

//API TO UPDATE TODO
app.put("/todos/:todoId/", invalidScenarios, async (request, response) => {
  const todoId = request.params.todoId;
  const { todo, status, priority, category, dueDate } = request.body;
  const allowedStatuses = ["TO DO", "IN PROGRESS", "DONE"];
  const allowedPriorities = ["HIGH", "MEDIUM", "LOW"];
  const allowedCategories = ["WORK", "HOME", "LEARNING"];
  const isDateValid = isValid(new Date(dueDate));

  if (status && !allowedStatuses.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (priority && !allowedPriorities.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (category && !allowedCategories.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (dueDate && !isDateValid) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    if (todo) {
      const updateTodoQuery = `
        UPDATE todo
        SET todo = '${todo}';
      `;
      await db.run(updateTodoQuery);
      response.send("Todo Updated");
    }
    if (status) {
      const updateStatusQuery = `
        UPDATE todo
        SET status = '${status}';
      `;
      await db.run(updateStatusQuery);
      response.send("Status Updated");
    } else if (priority) {
      const updatePriorityQuery = `
        UPDATE todo
        SET priority = '${priority}';
      `;
      await db.run(updatePriorityQuery);
      response.send("Priority Updated");
    } else if (category) {
      const updateCategoryQuery = `
        UPDATE todo
        SET category = '${category}';
      `;
      await db.run(updateCategoryQuery);
      response.send("Category Updated");
    } else if (dueDate) {
      const formattedDate = format(new Date(dueDate), "yyyy-MM-dd");
      const updateDueDateQuery = `
        UPDATE todo
        SET due_date = '${formattedDate}';
      `;
      await db.run(updateDueDateQuery);
      response.send("Due Date Updated");
    }
  }
});

//API TO DELETE TODO
app.delete("/todos/:todoId/", invalidScenarios, async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
        DELETE FROM todo
        WHERE id = ${todoId};
    `;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
