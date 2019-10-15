#include <iostream>
#include <iterator>
#include <algorithm>
#include <vector>
#include <functional>

const int e_key = 47;
const int d_key = 15;
const int n = 391;

struct crypt : std::binary_function<int, int, int> {
    int operator()(int input, int key) const {
        int result = 1;
        for (int i=0; i<key; i++) {
            result *= input;
            result %= n;
        }
        return result;
    }
};

int main() {
    std::string msg = "Drink more Ovaltine.";
    std::vector<int> encrypted;

    std::transform(msg.begin(), msg.end(),
        std::back_inserter(encrypted),
        std::bind2nd(crypt(), e_key));

    std::transform(encrypted.begin(), encrypted.end(),
        std::ostream_iterator<char>(std::cout, ""),
        std::bind2nd(crypt(), d_key));
    std::cout << "\n";

    return 0;
}
