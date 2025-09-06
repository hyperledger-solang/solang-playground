contract counter_demo {


    uint64 public count = 1;

    function decrement() public returns (uint64){
        count -= 1;
        return count;
    }


}