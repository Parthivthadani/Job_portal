import jobModel from "../models/jobModel.js";
import mongoose from "mongoose";
import moment from "moment";


//------------------Create Jobs-------------
export const createJobContoller = async (req, res,next) => {

    const {company,position,salary} = req.body
    if(!company || !position || !salary){
        next('Please Provide All Fields')
    }
    req.body.createdBy = req.user.userId 
    const job = await jobModel.create(req.body)
    res.status(201).json({job});

};

//----------------Get Jobs-------------------
export const getAllJobsController = async (req,res,next) => {
    const {status ,workType , search , sort} = req.query
    //Conditions for Searching filters
    let queryObject = {
        createdBy : req.user.userId
    }

    //logic fillers
    //status
    if(status && status !== 'all'){
        queryObject.status = status
    }
    //workType
    if(workType && workType !=='all'){
        queryObject.workType = workType
    }
    //position
    if(search ){
        queryObject.position = { $regex : search, $options : 'i'};
    }

    let queryResult = jobModel.find(queryObject)


    //sorting
    if(sort === "latest"){
        queryResult =queryResult.sort("-createdAt");
    }
    if(sort === "oldest"){
        queryResult =queryResult.sort("createdAt");
    }
    if(sort === "a-z"){
        queryResult =queryResult.sort("position");
    }
    if(sort === "z-a"){
        queryResult =queryResult.sort("-position");
    }

    
    const jobs = await queryResult;
    


    // const jobs = await jobsModel.find({createdBy:req.user.userId})
   res.status(200).json({
    totalJobs: jobs.length,
    jobs,
   });
};

//----------------Update Job-------------------

export const updateJobController = async (req,res,next) => {
        const {id} = req.params
        const {company , position, salary} = req.body
        //Validation
        if(!company || !position || !salary){
            next('Please Provide All Fields')
        }

        //find job
        const job = await jobModel.findOne({_id:id})

        //Validation
        if(!job){
            next(`no jobs found with this id ${id}`)
        }
        
        if(!req.user.userId === job.createdBy.toString()){
            next(`you are not authorized to update this job`)
            return;
        }
        const updateJob = await jobsModel.findOne({_id:id}, req.body , {
            new :true,
            runValidators :true
        })
        //res
        res.status(200).json({updateJob});
};

//----------------Delete Job-------------------

export const deleteJobController = async (req,res,next) => {

    const {id} =req.params
    //find job
    const job = await jobModel.findOne({_id:id})

    //validation
    if(!job){
        next(`no job found with this id ${id}`)
    }
    if(!req.user.userId === job.createdBy.toString()){
        next(`you are not authorized to delete this job`)
        return;
    }
    await job.deleteOne();

    res.status(200).json({message : `Success, Job Deleted!`})
};

//----------------Stats Filter Job-------------------

export const jobStatsController = async (req,res) =>{
    const stats = await jobModel.aggregate([
        // search by user jobs
        {
            $match :{
                createdBy :new mongoose.Types.ObjectId(req.user.userId),
            },
        },
        {
            $group :{
                _id : "$status",
                count : {$sum : 1},           
             }
        }
        
    ])
    
    
    //Default Stats
    const DefaultStats ={
        pending : stats.pending || 0,
        interview : stats.interview || 0,
        declined : stats.declined || 0,
        accepted : stats.accepted || 0
    }

    //monthly yearly stats
    let monthlyApplication = await jobModel.aggregate([
        { 
            $match:{
                createdBy :new mongoose.Types.ObjectId(req.user.userId),
            } 
        },
        {
            $group:{
                _id :{
                    year : {$year : $createdAt},
                    month : {$month : $createdAt}
                },
                count :{
                    $sum : 1,
                }

            }
        }

    ]);
    monthlyApplication = monthlyApplication.map(item =>{
        const {_id: { year,month},count} = item
        const date = moment().month(month-1).year(year).format('MMM y')
        return {date, count}
    })
    .reverse();
    res.status(200).json({totalJob : stats.length , DefaultStats , monthlyApplication});
};