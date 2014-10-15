/*
Converts all numbers less than 1,000,000,000,000,000 into a shortened 4-digit version E.G. 99999 -> 99.9K, 9999999 -> 9.99M, etc
*/
SIS.namespace("SIS.Filters.ShortNumber");
(function(namespace) {

    // Uses fallback if input is not provided
    namespace.filter = function() {
        return function(input) {
            var SUFFIXES = ['','K','M','B','T','Q'];
            if (typeof input === 'number' && input > 9999 && input < 1000000000000000000) {
                var stringNum = input.toString(),
                    m = Math.floor(stringNum.length/3),
                    r = stringNum.length % 3,
                    result = input;

                // Add the decimal
                result = r === 0 ? input.toString() : (input / Math.pow(10, 3*m)).toString();
                // Truncate the string
                result = r === 2 ? result.substring(0,4) : result.substring(0,3);
                // Add the suffix
                result = r === 0 ? result + SUFFIXES[m-1] : result + SUFFIXES[m];

                return result;
            } else {
                return input === undefined ? 0 : input;
            }
        };
    };

})(SIS.Filters.ShortNumber);