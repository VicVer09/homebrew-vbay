"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const elasticsearch_1 = require("elastic/elasticsearch");
const client = new elasticsearch_1.Client({
    cloud: {
        id: 'vBayElasticCloud:dXMtY2VudHJhbDEuZ2NwLmNsb3VkLmVzLmlvJDI3M2FiMzdkYzg4ZDQyMTFhODE0MjFkYzk0OGY4NjQ3JDI4YmQ2NGU0ZWNlZjQ2ZTdhNWFmZmNjODZlNTVkZjg0',
    },
    auth: {
        username: 'elastic',
        password: 'yoZO0tStZ3kc2CI3beWOr4dD'
    }
});
