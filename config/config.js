module.exports = {
    'Env': {
        'development': {
            'Database': 'mongodb://127.0.0.1/DailyExercise',
            'Image': 'https://s3.amazonaws.com/SiyaplaceDev/',
            'Redis': {
                'Host': '127.0.0.1',
                'Port': 6379
            },
        },
        'production': {
            'Database': 'mongodb://127.0.0.1/Note',
            'Image': 'https://s3.amazonaws.com/SiyaplaceDev/',
            'Redis': {
                'Host': '127.0.0.1',
                'Port': 6379
            }
        }
    },

    'JWTSecret': 'SiyaplaceSecret',
    
    'User': {
        'Types': {
            'Local': 1,
            'Facebook': 2,
            'Google': 3,
            'Twitter': 4,
            'LinkedIn': 5,
            'Yahoo': 6
        },

        'Role': {
            'Admin': 1,
            'User': 2
        },
        'Status': {
            'Active': 1,
            'Inactive': 2
        }
    }  
};
