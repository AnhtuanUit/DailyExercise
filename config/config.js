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
            'Database': 'mongodb://127.0.0.1/DailyExercise',
            'Image': 'https://s3.amazonaws.com/SiyaplaceDev/',
            'Redis': {
                'Host': '127.0.0.1',
                'Port': 6379
            }
        }
    },
    
    'S3': {
        'UploadPath': process.cwd() + '/uploads/',
        'BucketName': 'SiyaplaceDev',
        'Key': 'AKIAIOIR6IND44TFBQHA',
        'Image': {
            'Width': 320,
            'Height': 240
        }
    },
    'JWTSecret': 'DailyExerciseSecret',
    'Populate': {
        'Friend': 'senderId receiverId success',
        'User': 'username avatar isOnline gender',
        'UserFull': '-salt -hashed_password',
        'File': 'name originalName extension size type createdAt',
        'Image': 'name',
        'Event': 'title address startAt endAt createdAt statistic phones type mode avatar cover _userId desc',
        'EventFull': 'title address startAt endAt createdAt statistic phones type mode _userId latitude longitude cover avatar desc',
        'Activities': {
            'Event': 'title avatar',
            'Post': '_eventId content',
            'Comment': '_postId content'
        }
    },
    'GetPerQuery': {
        'Messages': 20,
        'Notifications': 10,
        'Activities': 10,
        'Timeline': 15,
        'Stickers': 12,
        'Follower': 30
    },
    'User': {
        'Types': {
            'Local': 1,
            'Facebook': 2,
            'Google': 3,
            'Twitter': 4,
            'LinkedIn': 5,
            'Yahoo': 6
        },
        'Access': {
            'WatingForRemoved': 1,
            'Disabled': 2
        },
        'Role': {
            'Admin': 1,
            'User': 2
        },
        'Status': {
            'Active': 1,
            'Inactive': 2
        }
    },
    'UserDevices': {
        'Types': {
            'PC': 1,
            'Mobile': 2
        },
        'Status': {
            'Online': 1,
            'Offline': 2
        }
    },
    
    'EventMembers': {
        'Roles': {
            'Admin': 1,
            'User': 2
        },
        'Status': {
            'Requested': 1,
            'Invited': 2,
            'Joined': 3
        }
    },
    
    'Messages': {
        'Types': {
            'Text': 1,
            'Image': 2,
            'File': 3
        }
    },
   
    'Comments': {
        'Types': {
            'Post': 1,
            'Sub': 2,
            'File': 3
        }
    },
    'Likes': {
        'Types': {
            'Posts': 'Posts',
            'Comments': 'Comments',
            'Files': 'Files'
        }
    },
  
    'Activities': {
        'News': {
            'Create': 100,
            'Vote': 110
        },
        'AddFriend': {
            'Create': 200,
            'Like': 210
        },
        'AcceptFriend': {
            'Create': 300,
            'Like': 310
        }
    },
    'Notify': {
        'type': {
            'addFriend': 0,
            'acceptFriend': 1
        }
    },
    'Pagination': {
        'PostPerEvent': 10,
        'CommentPerPost': 4,
        'CommentPerPostDetail': 10,
        'SubCommentPerComment': 10
    }
};
