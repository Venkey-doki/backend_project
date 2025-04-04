class ApiResponse{
    constructor(
        statuscode,
        data,
        message = "something went wrong",
    ){
        this.statusCode = statuscode;
        this.data = data;
        this.message = message;
        this.success = statuscode < 400;
    }
}

export default ApiResponse;