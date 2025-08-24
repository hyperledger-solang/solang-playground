export const defaultCode = `contract flipper {
  bool private value;

  /// Constructor that initializes the \`bool\` value to the given \`init_value\`.
  constructor(bool initvalue) {
    value = initvalue;
  }

  /// A message that can be called on instantiated contracts.
  /// This one flips the value of the stored \`bool\` from \`true\`
  /// to \`false\` and vice versa.
  function flip() public {
    value = !value;
  }

  /// Simply returns the current value of our \`bool\`.
  function get() public view returns (bool) {
    return value;
  }
}
`;

export const defaultAuth = `contract auth {
    // Only this address can call the increment function
    address public owner = address"GDRIX624OGPQEX264NY72UKOJQUASHU3PYKL6DDPGSTWXWJSBOTR6N7W";


    uint64 public instance counter = 20;

    function increment() public returns (uint64) {

        owner.requireAuth();

        counter = counter + 1;

        return counter;

    }
}
`;

export const defaultError = `contract error {
    uint64 public count = 1;

    function decrement() public returns (uint64) {
        print("Second call will FAIL!");
        count -= 1;
        return count;
    }
}
`;
export const defaultStorageTypes = `ccontract storage_types {

    uint64 public temporary var = 1;
    uint64 public instance var1 = 1;
    uint64 public persistent var2 = 2;
    uint64 public var3 = 2;

    function inc() public {
        var++;
        var1++;
        var2++;
        var3++;
    }

    function dec() public {
        var--;
        var1--;
        var2--;
        var3--;
    }
}
`;

export const defaultTTLStorage = `contract ttl_storage {
    uint64 public persistent pCount = 11;
    uint64 temporary tCount = 7;
    uint64 instance iCount = 3;

    function extend_persistent_ttl() public view returns (int64) {
        return pCount.extendTtl(1000, 5000);
    }

    function extend_temp_ttl() public view returns (int64) {
        return tCount.extendTtl(3000, 7000);
    }

    function extendInstanceTtl() public view returns (int64) {
        return extendInstanceTtl(2000, 10000);
    }
}
`;
